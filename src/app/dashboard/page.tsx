"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  GraduationCap,
  MessageCircle,
  Send,
  User,
  Bot,
  Search,
  BookOpen,
  Settings,
  LogOut,
  Star,
  MapPin,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Sparkles,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import type { UserProfile } from "@/lib/aiEngine";
import type { AIChatResponse, AIChatSource } from "@/lib/aiChatTypes";
import type { CollegeEntry } from "@/lib/collegeDatabase";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  colleges?: CollegeEntry[];
  sources?: AIChatSource[];
  followUpQuestions?: string[];
}

interface DashboardUser {
  firstName: string;
  lastName: string;
  email: string;
  id: string;
  currentSchool?: string;
}

interface UserProfileRecord {
  id: string;
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  location?: string | null;
}

interface ProfileCompletionFormState {
  username: string;
  gpa: string;
  state: string;
  intendedMajor: string;
  budget: "" | "low" | "medium" | "high";
}

interface AuthUserExtended {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  currentSchool?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
  };
}

const DASHBOARD_PROFILE_STORAGE_KEY_PREFIX = "eduguide:dashboard-profile:";
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

function getDashboardProfileStorageKey(userId: string): string {
  return `${DASHBOARD_PROFILE_STORAGE_KEY_PREFIX}${userId}`;
}

function parseStoredUserProfile(rawValue: string | null): Partial<UserProfile> {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    const next: Partial<UserProfile> = {};

    if (typeof parsed.gpa === "number" && parsed.gpa >= 0 && parsed.gpa <= 4.5) {
      next.gpa = parsed.gpa;
    }
    if (typeof parsed.state === "string" && parsed.state.trim()) {
      next.state = parsed.state.trim().toUpperCase();
    }
    if (typeof parsed.intendedMajor === "string" && parsed.intendedMajor.trim()) {
      next.intendedMajor = parsed.intendedMajor.trim();
    }
    if (parsed.budget === "low" || parsed.budget === "medium" || parsed.budget === "high") {
      next.budget = parsed.budget;
    }

    return next;
  } catch {
    return {};
  }
}

function buildWelcomeMessage(name: string): string {
  return `Welcome back, ${name}. I'm your research-backed EduGuide assistant.\n\nI can match schools to your profile, pull fresh details from official college sites, and help you think through applications, transfer plans, and academic decisions without making the chat feel robotic.\n\n**What I can help with right now:**\n- College matching based on GPA, budget, state, and interests\n- Official-site research on programs, admissions, aid, and student support\n- School comparisons, shortlist strategy, and next-step planning\n- Free assignment support inside your account: prompt breakdowns, concept explanations, outlines, study plans, and draft feedback\n\nTry saying: *"I want a strong computer science school in California with real aid and internship options."*`;
}

function createMessageId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeUserProfile(currentProfile: UserProfile, updates?: Partial<UserProfile>): UserProfile {
  if (!updates) return currentProfile;

  const mergeUnique = (values: string[] | undefined) =>
    values ? Array.from(new Set(values.filter(Boolean))) : undefined;

  return {
    ...currentProfile,
    ...updates,
    demographics: mergeUnique([...(currentProfile.demographics || []), ...(updates.demographics || [])]),
    interests: mergeUnique([...(currentProfile.interests || []), ...(updates.interests || [])]),
    preferredStates: mergeUnique([...(currentProfile.preferredStates || []), ...(updates.preferredStates || [])]),
    schoolType: mergeUnique([...(currentProfile.schoolType || []), ...(updates.schoolType || [])]),
  };
}

function openLiveAdvisor(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("eduguide:open-support", {
      detail: {
        live: true,
        message,
      },
    })
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [profileRecord, setProfileRecord] = useState<UserProfileRecord | null>(null);
  const [isLoadingProfileRecord, setIsLoadingProfileRecord] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [isSavingProfileDialog, setIsSavingProfileDialog] = useState(false);
  const [profileDialogError, setProfileDialogError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileCompletionFormState>({
    username: "",
    gpa: "",
    state: "",
    intendedMajor: "",
    budget: "",
  });
  const router = useRouter();
  const messageListRef = useRef<HTMLDivElement>(null);
  const hasAutoPromptedProfileRef = useRef(false);
  const hasHydratedLocalProfileRef = useRef(false);
  const [hasLoadedProfileRecord, setHasLoadedProfileRecord] = useState(false);

  const { user: authUser, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!authUser) {
      router.push("/login");
      return;
    }

    const typedAuthUser = authUser as AuthUserExtended;
    const firstName = typedAuthUser.firstName || typedAuthUser.user_metadata?.first_name || "Student";
    setUser({
      id: typedAuthUser.id,
      firstName,
      lastName: typedAuthUser.lastName || typedAuthUser.user_metadata?.last_name || "",
      email: typedAuthUser.email || "",
      currentSchool: typedAuthUser.currentSchool || ""
    });

    setMessages([{
      id: "welcome",
      content: buildWelcomeMessage(firstName),
      sender: "ai",
      timestamp: new Date(),
    }]);
  }, [authUser, loading, router]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages.length and isTyping are intentional trigger deps
  useEffect(() => {
    const viewport = messageListRef.current;
    if (!viewport) return;

    const timer = window.setTimeout(() => {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: "smooth",
      });
    }, 60);

    return () => window.clearTimeout(timer);
  }, [messages.length, isTyping]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: user?.id is the reset trigger; refs and setters are stable
  useEffect(() => {
    hasAutoPromptedProfileRef.current = false;
    hasHydratedLocalProfileRef.current = false;
    setHasLoadedProfileRecord(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const storedProfile = parseStoredUserProfile(
      window.localStorage.getItem(getDashboardProfileStorageKey(user.id))
    );

    hasHydratedLocalProfileRef.current = true;
    if (Object.keys(storedProfile).length > 0) {
      setUserProfile(prev => ({ ...prev, ...storedProfile }));
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    if (!hasHydratedLocalProfileRef.current) return;

    const persisted = {
      gpa: typeof userProfile.gpa === "number" ? userProfile.gpa : undefined,
      state: userProfile.state || undefined,
      intendedMajor: userProfile.intendedMajor || undefined,
      budget: userProfile.budget || undefined,
    };

    window.localStorage.setItem(
      getDashboardProfileStorageKey(user.id),
      JSON.stringify(persisted)
    );
  }, [user?.id, userProfile.gpa, userProfile.state, userProfile.intendedMajor, userProfile.budget]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    setIsLoadingProfileRecord(true);
    setHasLoadedProfileRecord(false);

    // Get the current access token for the authenticated API call
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        if (!cancelled) {
          setIsLoadingProfileRecord(false);
          setHasLoadedProfileRecord(true);
        }
        return;
      }

      return fetch("/api/user-profile", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => ({}))) as { profile?: UserProfileRecord | null; error?: string };
          if (!response.ok) throw new Error(payload.error || "Failed to load profile");
          return payload.profile ?? null;
        })
        .then((profile) => {
          if (!cancelled) setProfileRecord(profile);
        })
        .catch((error) => {
          if (!cancelled) {
            console.error("Failed to load dashboard profile:", error);
            toast.error("Could not load your profile. Please refresh.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingProfileRecord(false);
            setHasLoadedProfileRecord(true);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const openProfileCompletionDialog = () => {
    setProfileDialogError(null);
    setProfileForm({
      username: profileRecord?.username || "",
      gpa: typeof userProfile.gpa === "number" ? String(userProfile.gpa) : "",
      state: userProfile.state || "",
      intendedMajor: userProfile.intendedMajor || "",
      budget: userProfile.budget || "",
    });
    setIsProfileDialogOpen(true);
  };

  const saveProfileCompletionDialog = async () => {
    if (!user) return;

    const normalizedUsername = profileForm.username.trim().toLowerCase();
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      setProfileDialogError("Username must be 3-30 characters and use only letters, numbers, and underscores.");
      return;
    }

    let parsedGpa: number | undefined;
    if (profileForm.gpa.trim()) {
      const gpaValue = Number.parseFloat(profileForm.gpa.trim());
      if (!Number.isFinite(gpaValue) || gpaValue < 0 || gpaValue > 4.5) {
        setProfileDialogError("GPA must be a number between 0.0 and 4.5.");
        return;
      }
      parsedGpa = Number.parseFloat(gpaValue.toFixed(2));
    }

    setProfileDialogError(null);
    setIsSavingProfileDialog(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired. Please log in again.");

      const response = await fetch("/api/user-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user.email || null,
          full_name: `${user.firstName} ${user.lastName}`.trim() || null,
          username: normalizedUsername,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { profile?: UserProfileRecord; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save profile details");
      }

      setProfileRecord(payload.profile || {
        id: user.id,
        username: normalizedUsername,
        full_name: `${user.firstName} ${user.lastName}`.trim() || null,
        email: user.email || null,
      });

      setUserProfile((prev) => {
        const next = { ...prev };

        if (parsedGpa !== undefined) next.gpa = parsedGpa;
        else delete next.gpa;

        const normalizedState = profileForm.state.trim().toUpperCase();
        if (normalizedState) next.state = normalizedState;
        else delete next.state;

        const major = profileForm.intendedMajor.trim();
        if (major) next.intendedMajor = major;
        else delete next.intendedMajor;

        if (profileForm.budget) next.budget = profileForm.budget;
        else delete next.budget;

        return next;
      });

      hasAutoPromptedProfileRef.current = true;
      setIsProfileDialogOpen(false);
      toast.success("Profile details saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile details";
      setProfileDialogError(message);
    } finally {
      setIsSavingProfileDialog(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: openProfileCompletionDialog only calls stable state setters
  useEffect(() => {
    if (!user || !hasLoadedProfileRecord || isLoadingProfileRecord || hasAutoPromptedProfileRef.current) return;
    if (!profileRecord?.username) {
      hasAutoPromptedProfileRef.current = true;
      openProfileCompletionDialog();
    }
  }, [user, hasLoadedProfileRecord, isLoadingProfileRecord, profileRecord?.username]);

  const sendMessage = async () => {
    if (isTyping || !inputMessage.trim()) return;

    const userMessage: Message = {
      id: createMessageId("user"),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentProfile: userProfile,
          history: [
            ...messages.slice(-13).map((message) => ({
              role: message.sender === "user" ? "user" : "assistant",
              content: message.content,
            })),
            {
              role: "user" as const,
              content: currentInput,
            },
          ],
          message: currentInput,
          mode: "dashboard",
          userName: profileRecord?.username || user?.firstName,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as AIChatResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Chat request failed");
      }

      if (payload.profileUpdates) {
        setUserProfile((prev) => mergeUserProfile(prev, payload.profileUpdates));
      }

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId("ai"),
          content: payload.content,
          sender: "ai",
          timestamp: new Date(),
          colleges: payload.colleges,
          sources: payload.sources,
          followUpQuestions: payload.followUpQuestions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId("ai-error"),
          content: "I ran into an issue generating that response. Please try again.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputMessage(prompt);
  };

  const handleLogout = async () => {
    try {
      const { error } = await signOut();
      if (error) throw error;
      toast.success("Logged out successfully!");
    } catch {
      // Still clear client state and redirect even if the API call failed
      toast.error("Sign-out failed. You have been redirected.");
    } finally {
      router.push("/");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
      </div>
    );
  }

  const collegesExplored = messages.reduce((acc, msg) => acc + (msg.colleges?.length || 0), 0);
  const hasUsername = Boolean(profileRecord?.username);
  const profileCompleteness = [
    profileRecord?.username,
    userProfile.gpa,
    userProfile.state,
    userProfile.intendedMajor,
    userProfile.budget,
  ].filter(Boolean).length;
  const profileCompletenessWidthClass = ["w-0", "w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"][profileCompleteness];
  const displayName = profileRecord?.username
    ? `@${profileRecord.username}`
    : `${user.firstName} ${user.lastName}`.trim() || user.email;
  const avatarText = (
    profileRecord?.username?.slice(0, 2) ||
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}` ||
    user.email.slice(0, 2) ||
    "U"
  ).toUpperCase();
  const missingProfileFields = [
    !hasUsername ? "username" : null,
    !userProfile.gpa ? "GPA" : null,
    !userProfile.state ? "state" : null,
    !userProfile.intendedMajor ? "major" : null,
    !userProfile.budget ? "budget" : null,
  ].filter(Boolean) as string[];

  const nextBestStep = (() => {
    if (profileCompleteness < 5) {
      return {
        title: "Complete Your Profile",
        detail: `Add ${missingProfileFields.join(", ")} to unlock better matches and student guidance.`,
        actionLabel: "Complete Profile Form",
        action: openProfileCompletionDialog,
      };
    }

    if (collegesExplored < 3) {
      return {
        title: "Build a Shortlist",
        detail: "Explore at least 3 recommended schools before comparing options.",
        actionLabel: "Find 3 Matching Colleges",
        action: () => handleQuickAction("Find at least three colleges that match my profile."),
      };
    }

    return {
      title: "Advisor Review",
      detail: "Escalate to live support for deadline and application strategy checks.",
      actionLabel: "Talk to Live Advisor",
      action: () =>
        openLiveAdvisor(
          "I need a live advisor to review my shortlist and confirm my next application steps."
        ),
    };
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">EduGuide</span>
            </Link>

            <div className="flex items-center space-x-4">
              <Link href="/colleges">
                <Button variant="ghost" size="sm">Colleges</Button>
              </Link>
              <Link href="/services">
                <Button variant="ghost" size="sm">Services</Button>
              </Link>
              <Link href="/feedback">
                <Button variant="ghost" size="sm">Feedback</Button>
              </Link>
              <Avatar>
                <AvatarFallback>
                  {avatarText}
                </AvatarFallback>
              </Avatar>
              <span className="text-gray-900 hidden sm:inline">
                {displayName}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Profile Completeness */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Your Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                      className={`bg-blue-600 h-2 rounded-full transition-all duration-500 ${profileCompletenessWidthClass}`}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{profileCompleteness}/5 details shared</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Username</span>
                      <Badge variant={profileRecord?.username ? "default" : "secondary"}>
                        {profileRecord?.username ? `@${profileRecord.username}` : "Not set"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">GPA</span>
                      <Badge variant={userProfile.gpa ? "default" : "secondary"}>
                        {userProfile.gpa || "Not set"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Location</span>
                      <Badge variant={userProfile.state ? "default" : "secondary"}>
                        {userProfile.state || "Not set"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Major</span>
                      <Badge variant={userProfile.intendedMajor ? "default" : "secondary"}>
                        {userProfile.intendedMajor || "Not set"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Budget</span>
                      <Badge variant={userProfile.budget ? "default" : "secondary"}>
                        {userProfile.budget || "Not set"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Your Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Messages</span>
                    <Badge variant="secondary">{messages.length - 1}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Colleges Explored</span>
                    <Badge variant="secondary">{collegesExplored}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Next Best Step */}
              <Card className="border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Next Best Step
                  </CardTitle>
                  <CardDescription>{nextBestStep.title}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">{nextBestStep.detail}</p>
                  <Button className="w-full" onClick={nextBestStep.action}>
                    {nextBestStep.actionLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Quick Prompts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleQuickAction("Find colleges that match my profile")}>
                    <Search className="mr-2 h-4 w-4" />
                    Find Matching Colleges
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleQuickAction("Tell me about community colleges")}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Community Colleges
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleQuickAction("What financial aid options are available?")}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Financial Aid Help
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => handleQuickAction("Help me with admissions requirements")}>
                    <Target className="mr-2 h-4 w-4" />
                    Admissions Guide
                  </Button>
                  <Link href="/tutoring-support">
                    <Button variant="ghost" className="w-full justify-start text-sm">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Get Tutoring Help
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start text-sm" onClick={openProfileCompletionDialog}>
                    <Settings className="mr-2 h-4 w-4" />
                    Complete Profile Details
                  </Button>
                  <Link href="/profile">
                    <Button variant="ghost" className="w-full justify-start text-sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Profile Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col overflow-hidden h-[calc(100vh-200px)] min-h-[600px] max-h-[850px]">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bot className="h-6 w-6 text-blue-600" />
                  <CardTitle>High-End College & Study AI</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Research + Fit
                  </Badge>
                </div>
                <CardDescription>
                  Ask naturally. The assistant will clarify what matters, pull official-school details when needed, and help with free assignment support inside your account.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div
                  ref={messageListRef}
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-2"
                  aria-live="polite"
                >
                  <div className="space-y-4 pb-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex w-full max-w-[90%] space-x-2 sm:max-w-[85%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback>
                              {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>

                          <div className={`max-w-full overflow-hidden break-words rounded-lg px-4 py-3 ${
                            message.sender === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}>
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.content}</p>

                            {message.sources && message.sources.length > 0 && (
                              <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fresh official site notes</p>
                                <div className="mt-2 space-y-2">
                                  {message.sources.map((source) => (
                                    <div key={`${source.url}-${source.title}`} className="text-xs text-gray-600">
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-blue-600 hover:text-blue-800"
                                      >
                                        {source.title}
                                      </a>
                                      <p className="mt-1 leading-relaxed">{source.note}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {message.colleges && message.colleges.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {message.colleges.map((college) => (
                                  <Card key={college.id} className="bg-white border shadow-sm">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-gray-900 flex items-center gap-1">
                                            {college.name}
                                            <a
                                              href={college.website}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800"
                                              title={`Visit ${college.name} website`}
                                              aria-label={`Visit ${college.name} website`}
                                            >
                                              <ExternalLink className="h-3 w-3" />
                                              <span className="sr-only">Visit {college.name} website</span>
                                            </a>
                                          </h4>
                                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            <div className="flex items-center">
                                              <MapPin className="h-3 w-3 mr-1 shrink-0" />
                                              {college.location}
                                            </div>
                                            <div className="flex items-center">
                                              <BookOpen className="h-3 w-3 mr-1 shrink-0" />
                                              {college.type}
                                            </div>
                                            <div className="flex items-center">
                                              <DollarSign className="h-3 w-3 mr-1 shrink-0" />
                                              {college.tuition}
                                            </div>
                                            <div className="flex items-center">
                                              <Users className="h-3 w-3 mr-1 shrink-0" />
                                              Acceptance: {college.acceptanceRate} | Graduation: {college.graduationRate}%
                                            </div>
                                            {college.avgGPA > 0 && (
                                              <div className="flex items-center">
                                                <TrendingUp className="h-3 w-3 mr-1 shrink-0" />
                                                Avg GPA: {college.avgGPA} | Aid: {college.financialAidPercent}% of students
                                              </div>
                                            )}
                                          </div>
                                          <div className="mt-2 flex flex-wrap gap-1">
                                            {college.majors.slice(0, 4).map(m => (
                                              <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                                            ))}
                                            {college.majors.length > 4 && (
                                              <Badge variant="secondary" className="text-xs">+{college.majors.length - 4} more</Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-center ml-3">
                                          <div className="flex items-center space-x-1">
                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                            <span className="text-sm font-medium">#{college.ranking}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="mt-2 text-xs text-gray-500">{college.description}</p>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}

                            {/* Follow-up question chips */}
                            {message.sender === "ai" && message.followUpQuestions && message.followUpQuestions.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.followUpQuestions.slice(0, 3).map((q) => (
                                  <button
                                    key={q}
                                    type="button"
                                    onClick={() => {
                                      setInputMessage(q);
                                      // Focus the input after setting
                                      setTimeout(() => {
                                        const input = document.querySelector<HTMLInputElement>('input[placeholder*="Try:"]');
                                        input?.focus();
                                      }, 50);
                                    }}
                                    className="text-xs bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-400 rounded-full px-3 py-1.5 transition-colors text-left"
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isTyping && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                        <div className="flex space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div className="bg-gray-100 rounded-lg px-4 py-3">
                            <div className="flex space-x-1 items-center">
                              <Sparkles className="h-3 w-3 text-blue-600 animate-pulse mr-1" />
                              <span className="text-xs text-gray-500 mr-2">Researching your options...</span>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-100" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-200" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder='Try: "I need affordable nursing schools with strong support and clean transfer paths"'
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    disabled={isTyping}
                  />
                  <Button onClick={sendMessage} disabled={isTyping || !inputMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Complete Your Student Profile</DialogTitle>
            <DialogDescription>
              Add a username and your academic preferences so EduGuide can give better matches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-username">Username</Label>
              <Input
                id="dashboard-username"
                value={profileForm.username}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    username: e.target.value.replace(/\s+/g, ""),
                  }))
                }
                placeholder="e.g. collin_edu"
                autoComplete="username"
                maxLength={30}
              />
              <p className="text-xs text-gray-500">
                3-30 characters. Use letters, numbers, and underscores.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dashboard-gpa">GPA</Label>
                <Input
                  id="dashboard-gpa"
                  value={profileForm.gpa}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, gpa: e.target.value }))}
                  placeholder="3.2"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-state">Preferred State</Label>
                <Input
                  id="dashboard-state"
                  value={profileForm.state}
                  onChange={(e) =>
                    setProfileForm((prev) => ({
                      ...prev,
                      state: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="CA"
                  maxLength={20}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboard-major">Intended Major</Label>
              <Input
                id="dashboard-major"
                value={profileForm.intendedMajor}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    intendedMajor: e.target.value,
                  }))
                }
                placeholder="Computer Science"
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dashboard-budget">Budget Preference</Label>
              <select
                id="dashboard-budget"
                value={profileForm.budget}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    budget: e.target.value as ProfileCompletionFormState["budget"],
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select budget</option>
                <option value="low">Low / Affordable</option>
                <option value="medium">Medium</option>
                <option value="high">High / Flexible</option>
              </select>
            </div>

            {profileDialogError && (
              <p className="text-sm text-red-600">{profileDialogError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProfileDialogOpen(false)}
              disabled={isSavingProfileDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveProfileCompletionDialog}
              disabled={isSavingProfileDialog}
            >
              {isSavingProfileDialog ? "Saving..." : "Save Profile Details"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
