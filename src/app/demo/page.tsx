"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Send,
  User,
  Bot,
  ArrowLeft,
  Star,
  MapPin,
  DollarSign,
  Users,
  BookOpen,
  Info,
  TrendingUp,
  Sparkles,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import type { UserProfile } from "@/lib/aiEngine";
import type { AIChatResponse, AIChatSource } from "@/lib/aiChatTypes";
import type { CollegeEntry } from "@/lib/collegeDatabase";

const FREE_DEMO_MESSAGES = 3;
const DEMO_EMAIL_STORAGE_KEY = "eduguide-demo-email";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  colleges?: CollegeEntry[];
  sources?: AIChatSource[];
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

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [emailPromptOpen, setEmailPromptOpen] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [hasUnlockedDemo, setHasUnlockedDemo] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      id: "welcome",
      content: `Welcome to the EduGuide AI Assistant Demo.\n\nI'm your research-backed college guide. I can learn what you want, pull in official school information, and help you tighten your shortlist without making you fill out a giant form first.\n\n**What I can do:**\n- Match colleges to your GPA, budget, location, and interests\n- Pull fresh details from official school sites when you want specifics\n- Compare admissions, fit, cost, and transfer pathways\n- After sign-up, help with assignments for free by breaking prompts down, explaining concepts, building outlines, and reviewing drafts\n\n**Try saying:**\n- "I'm into nursing, need affordable options, and want to stay in Texas"\n- "Compare UCLA and Santa Monica College for transfer potential"\n- "I want a school with strong computer science and real financial aid"\n- "Can you help me plan an essay and shortlist schools?"`,
      sender: "ai",
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedEmail = window.localStorage.getItem(DEMO_EMAIL_STORAGE_KEY)?.trim().toLowerCase() ?? "";
    if (!savedEmail || !EMAIL_REGEX.test(savedEmail)) return;

    setRegistrationEmail(savedEmail);
    setHasUnlockedDemo(true);
  }, []);

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

  const registerUrl = registrationEmail.trim()
    ? `/register?email=${encodeURIComponent(registrationEmail.trim().toLowerCase())}`
    : "/register";

  const handleRegistrationUnlock = () => {
    const normalizedEmail = registrationEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setRegistrationError("Enter a valid email address to continue.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_EMAIL_STORAGE_KEY, normalizedEmail);
    }

    setRegistrationEmail(normalizedEmail);
    setRegistrationError(null);
    setHasUnlockedDemo(true);
    setEmailPromptOpen(false);
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId("ai-email-gate"),
        content: "Your email is saved and the chat is unlocked. Keep going here, or create your full account to save your shortlist and unlock free assignment support.",
        sender: "ai",
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async () => {
    if (isTyping || !inputMessage.trim()) return;

    if (messageCount >= FREE_DEMO_MESSAGES && !hasUnlockedDemo) {
      setRegistrationError(null);
      setEmailPromptOpen(true);
      return;
    }

    const nextCount = messageCount + 1;
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
    setMessageCount(nextCount);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentProfile: userProfile,
          history: [
            ...messages.slice(-7).map((message) => ({
              role: message.sender === "user" ? "user" : "assistant",
              content: message.content,
            })),
            {
              role: "user" as const,
              content: currentInput,
            },
          ],
          message: currentInput,
          mode: "demo",
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
      if (nextCount >= FREE_DEMO_MESSAGES && !hasUnlockedDemo) {
        setRegistrationError(null);
        setEmailPromptOpen(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link href="/register">
            <Button>Create Account</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> You can send up to 3 free messages. After that, add your email to unlock the rest of the demo, keep your shortlist moving, and access free assignment support after sign-up.
            <Link href="/register" className="text-blue-600 hover:underline ml-1">
              Create an account
            </Link> for unlimited access!
          </AlertDescription>
        </Alert>

        <Card className="flex flex-col overflow-hidden h-[calc(100vh-300px)] min-h-[500px] max-h-[700px]">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Bot className="h-6 w-6 text-blue-600" />
                <CardTitle>Research-Backed College AI</CardTitle>
                <Badge variant="secondary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Inquisitive Mode
                </Badge>
              </div>
              <div className="shrink-0 text-sm text-gray-500">
                Free demo: {Math.min(messageCount, FREE_DEMO_MESSAGES)}/{FREE_DEMO_MESSAGES}
              </div>
            </div>
            <CardDescription>
              Tell it what you want, what you can afford, and what kind of school vibe you need. It will ask smart follow-ups and tighten the list fast.
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
                                            Avg GPA: {college.avgGPA} | Aid: {college.financialAidPercent}% receive aid
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {college.majors.slice(0, 3).map(m => (
                                          <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                                        ))}
                                        {college.majors.length > 3 && (
                                          <Badge variant="secondary" className="text-xs">+{college.majors.length - 3} more</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1 ml-2">
                                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                      <span className="text-sm font-medium">#{college.ranking}</span>
                                    </div>
                                  </div>
                                  <p className="mt-2 text-xs text-gray-500">{college.description}</p>
                                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                    Create an account for detailed analytics and application tracking!
                                  </div>
                                </CardContent>
                              </Card>
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
                          <span className="text-xs text-gray-500 mr-2">Researching your fit...</span>
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

            <div className="flex items-end gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={messageCount >= FREE_DEMO_MESSAGES && !hasUnlockedDemo ? "Add your email to continue the demo" : 'Try: "I want an affordable nursing program with strong support and easy transfer options"'}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={isTyping || (messageCount >= FREE_DEMO_MESSAGES && !hasUnlockedDemo)}
              />
              <Button className="shrink-0" onClick={sendMessage} disabled={isTyping || !inputMessage.trim() || (messageCount >= FREE_DEMO_MESSAGES && !hasUnlockedDemo)}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {messageCount >= FREE_DEMO_MESSAGES && !hasUnlockedDemo && (
              <div className="mt-2 text-center">
                <p className="text-sm text-orange-600">
                  Add your email to keep going with the demo and unlock free assignment support after sign-up, or{" "}
                  <Link href={registerUrl} className="text-blue-600 hover:underline">
                    create your full account
                  </Link>
                  .
                </p>
              </div>
            )}
            {hasUnlockedDemo && (
              <div className="mt-2 text-center">
                <p className="text-sm text-emerald-700">
                  Demo unlocked for <span className="font-medium">{registrationEmail}</span>.{" "}
                  <Link href={registerUrl} className="text-blue-600 hover:underline">
                    Finish account setup for saved chats and free assignment support
                  </Link>
                  .
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h2 className="text-2xl font-bold mb-4">Ready for the Full Experience?</h2>
          <p className="text-lg mb-6 opacity-90">
            Create your account for unlimited AI help, saved preferences, faster school research, and free assignment support that helps you plan, understand, and polish your work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                Create Free Account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 text-white border-white hover:bg-white hover:text-blue-600">
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      <Dialog open={emailPromptOpen} onOpenChange={setEmailPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keep Chatting</DialogTitle>
            <DialogDescription>
              You&apos;ve used your 3 free demo messages. Add your email to unlock the rest of the demo now, then create your account when you want saved chats and free assignment support.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label htmlFor="demo-registration-email" className="text-sm font-medium text-gray-900">
              Email address
            </label>
            <Input
              id="demo-registration-email"
              type="email"
              value={registrationEmail}
              onChange={(event) => setRegistrationEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {registrationError && (
              <p className="text-sm text-red-600">{registrationError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Link href={registerUrl} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Create Full Account
              </Button>
            </Link>
            <Button onClick={handleRegistrationUnlock} className="w-full sm:w-auto">
              Save Email & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
