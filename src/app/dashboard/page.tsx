"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
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
import { processMessage, type UserProfile } from "@/lib/aiEngine";
import type { CollegeEntry } from "@/lib/collegeDatabase";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  colleges?: CollegeEntry[];
}

interface DashboardUser {
  firstName: string;
  lastName: string;
  email: string;
  id: string;
  currentSchool?: string;
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

export default function DashboardPage() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      content: `Welcome back, ${firstName}! I'm your AI college guidance assistant powered by EduGuide's recommendation engine.\n\nI can analyze your academic profile and match you with the best colleges and universities. Here's what I can help with:\n\n**College Matching** - Tell me your GPA, preferred location, and interests\n**Financial Aid** - Find scholarships and funding options\n**Admissions** - Application requirements and deadlines\n**Community Colleges** - Transfer pathways and affordable options\n**Test Prep** - SAT/ACT guidance\n**Essay Help** - Personal statement tips\n\nTry saying: *"My GPA is 3.2 and I'm interested in computer science in California"*`,
      sender: "ai",
      timestamp: new Date(),
    }]);
  }, [authUser, loading, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    // Process with AI engine
    setTimeout(() => {
      const aiResponse = processMessage(currentInput, userProfile, user?.firstName);

      // Update user profile with extracted info
      if (aiResponse.profileUpdates) {
        setUserProfile(prev => ({ ...prev, ...aiResponse.profileUpdates }));
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.content,
        sender: "ai",
        timestamp: new Date(),
        colleges: aiResponse.colleges,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  const handleQuickAction = (prompt: string) => {
    setInputMessage(prompt);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully!");
      router.push("/");
    } catch {
      toast.success("Logged out successfully!");
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
  const profileCompleteness = [userProfile.gpa, userProfile.state, userProfile.intendedMajor, userProfile.budget].filter(Boolean).length;
  const profileCompletenessWidthClass = ["w-0", "w-1/4", "w-2/4", "w-3/4", "w-full"][profileCompleteness];

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
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-gray-900 hidden sm:inline">
                {user.firstName} {user.lastName}
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
                  <p className="text-xs text-gray-500">{profileCompleteness}/4 details shared</p>
                  <div className="space-y-2 text-sm">
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
            <Card className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] max-h-[850px]">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bot className="h-6 w-6 text-blue-600" />
                  <CardTitle>AI College Guidance Assistant</CardTitle>
                  <Badge variant="secondary" className="ml-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Smart Matching
                  </Badge>
                </div>
                <CardDescription>
                  Share your GPA, location, and interests for personalized college recommendations
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 min-h-0 pr-4">
                  <div className="space-y-4 pb-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex space-x-2 max-w-[85%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback>
                              {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>

                          <div className={`rounded-lg px-4 py-3 ${
                            message.sender === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

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
                              <span className="text-xs text-gray-500 mr-2">Analyzing...</span>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-100" />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce animation-delay-200" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder='Try: "My GPA is 3.2 and I want to study nursing in Texas"'
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
    </div>
  );
}
