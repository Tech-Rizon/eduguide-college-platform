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
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  colleges?: College[];
}

interface College {
  id: string;
  name: string;
  location: string;
  type: string;
  tuition: string;
  acceptance_rate: string;
  ranking: number;
}

const sampleColleges: College[] = [
  {
    id: "1",
    name: "University of California, Los Angeles",
    location: "Los Angeles, CA",
    type: "Public University",
    tuition: "$13,804 (in-state), $43,022 (out-of-state)",
    acceptance_rate: "12%",
    ranking: 1
  },
  {
    id: "2",
    name: "Santa Monica Community College",
    location: "Santa Monica, CA",
    type: "Community College",
    tuition: "$1,380 (in-state), $8,820 (out-of-state)",
    acceptance_rate: "Open enrollment",
    ranking: 5
  },
  {
    id: "3",
    name: "Stanford University",
    location: "Stanford, CA",
    type: "Private University",
    tuition: "$59,394",
    acceptance_rate: "4%",
    ranking: 2
  }
];

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
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user: authUser, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!authUser) {
      router.push("/login");
      return;
    }

    // Set user from authentication
    const typedAuthUser = authUser as AuthUserExtended;
    setUser({
      id: typedAuthUser.id,
      firstName: typedAuthUser.firstName || typedAuthUser.user_metadata?.first_name || 'Demo',
      lastName: typedAuthUser.lastName || typedAuthUser.user_metadata?.last_name || 'User',
      email: typedAuthUser.email || 'demo@example.com',
      currentSchool: typedAuthUser.currentSchool || 'Demo School'
    });

    // Add welcome message
    setMessages([{
      id: "welcome",
      content: `Hi there! I'm your AI college guidance assistant. I'm here to help you find the perfect college or university. I can help you with:

• Finding colleges that match your interests and academic goals
• Understanding admission requirements
• Exploring different programs and majors
• Learning about financial aid and scholarships
• Getting tips for college applications

What would you like to know about colleges today?`,
      sender: "ai",
      timestamp: new Date(),
    }]);
  }, [authUser, loading, router]);

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Use setTimeout to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const simulateAIResponse = (userMessage: string): { content: string; colleges?: College[] } => {
    const message = userMessage.toLowerCase();

    // For logged in users, access their profile info for more personalized responses
    const userInfo = user ? `Based on your profile - ${user.firstName} from ${user.currentSchool || 'your school'}` : '';

    if (message.includes("california") || message.includes("ca") || message.includes("west coast")) {
      return {
        content: `Great choice! California has excellent educational opportunities. ${userInfo ? `${userInfo}, here` : 'Here'} are some colleges in California that might interest you:`,
        colleges: sampleColleges
      };
    }

    if (message.includes("computer science") || message.includes("engineering") || message.includes("tech")) {
      return {
        content: `Excellent choice! Computer Science and Engineering are in high demand. ${userInfo ? `${userInfo}, before` : 'Before'} I recommend specific programs, could you tell me:

• **What's your current location or preferred state?**
• **Are you interested in research universities or more practical/applied programs?**
• **Do you prefer large universities or smaller colleges?**

Here are some top CS/Engineering programs to consider:`,
        colleges: sampleColleges.slice(0, 2)
      };
    }

    if (message.includes("community college") || message.includes("affordable") || message.includes("cheap") || message.includes("budget")) {
      return {
        content: `Smart thinking! Community colleges are excellent and affordable. ${userInfo ? `${userInfo}, to` : 'To'} help you find the best options:

• **What city/state are you in?** (for local options)
• **What do you plan to study?**
• **Are you planning to transfer to a 4-year university later?**

Here's an example of an excellent community college:`,
        colleges: [sampleColleges[1]]
      };
    }

    if (message.includes("requirements") || message.includes("admission") || message.includes("apply")) {
      return {
        content: `Great question! ${userInfo ? `${userInfo}, admission` : 'Admission'} requirements vary by school type. To give you specific guidance:

• **What type of schools are you applying to?** (Community college, state university, private university)
• **What's your current education level?** (High school, GED, transfer student)
• **Do you have standardized test scores?** (SAT/ACT)

**General Requirements:**

**Universities:**
• High school diploma/GED + SAT/ACT scores
• GPA typically 2.5-4.0 (varies by school)
• Letters of recommendation & personal essay
• Extracurricular activities

**Community Colleges:**
• High school diploma/GED
• Placement tests for math/English
• Open enrollment (much easier admission)

Would you like help creating an admission strategy based on your specific situation?`
      };
    }

    if (message.includes("financial aid") || message.includes("scholarship") || message.includes("money") || message.includes("cost")) {
      return {
        content: `I'd love to help with financial aid! ${userInfo ? `${userInfo}, to` : 'To'} give you the most relevant information:

• **What's your estimated family income range?** (affects aid eligibility)
• **Are you a first-generation college student?**
• **What state do you live in?** (for state-specific aid)
• **Any special circumstances?** (military, athletics, academic achievements)

**Here are the main funding options:**

**Federal Aid (file FAFSA):**
• Pell Grants (up to $7,000+/year, don't repay)
• Federal student loans
• Work-study programs

**Scholarships:**
• Merit-based (academic performance)
• Need-based aid
• Field-specific scholarships
• Athletic/extracurricular scholarships

**State & Local:**
• State grant programs
• Community foundation scholarships
• Employer tuition assistance

Would you like help finding specific scholarship opportunities?`
      };
    }

    // Location-based responses
    if (message.includes("texas") || message.includes("tx")) {
      return {
        content: `Texas has fantastic educational opportunities! ${userInfo ? `${userInfo}, to` : 'To'} help narrow down your options:

• **What part of Texas?** (Dallas, Houston, Austin, San Antonio, etc.)
• **Looking for universities or community colleges?**
• **Interested in any specific programs?**

Texas has excellent public universities like UT Austin, Texas A&M, and many great community colleges with affordable tuition for residents.`
      };
    }

    if (message.includes("new york") || message.includes("ny")) {
      return {
        content: `New York offers incredible educational diversity! ${userInfo ? `${userInfo}, a` : 'A'} few questions to help:

• **NYC area or upstate New York?**
• **Preferred program of study?**
• **Budget considerations?** (NYC can be expensive)

NY has world-class universities like Columbia, NYU, Cornell, plus excellent SUNY and CUNY systems for more affordable options.`
      };
    }

    // Default responses with follow-up questions
    const responses = [
      `That's a great question! ${userInfo ? `${userInfo}, can` : 'Can'} you tell me more about your specific interests or goals? I'd love to help you find colleges that match what you're looking for.

• **Your preferred location for college**
• **Your main academic interests**
• **Whether you prefer universities or community colleges**`,

      `I'd be happy to help with that! ${userInfo ? `${userInfo}, what's` : "What's"} your current academic situation? Are you in high school, community college, or looking to transfer?

• **What do you want to study?**
• **Any preference for school size or setting?**
• **Budget considerations?**`,

      `Excellent question! ${userInfo ? `${userInfo}, to` : 'To'} give you the best recommendations, could you share:

• **What you're most interested in studying**
• **What state or region interests you**
• **Your timeline for starting college**`
    ];

    return {
      content: responses[Math.floor(Math.random() * responses.length)]
    };
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse = simulateAIResponse(inputMessage);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.content,
        sender: "ai",
        timestamp: new Date(),
        colleges: aiResponse.colleges,
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.success("Logged out successfully!");
      router.push("/");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
              <Avatar>
                <AvatarFallback>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-gray-900">
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
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Journey</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Messages</span>
                    <Badge variant="secondary">{messages.length - 1}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Colleges Explored</span>
                    <Badge variant="secondary">
                      {messages.reduce((acc, msg) => acc + (msg.colleges?.length || 0), 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="ghost" className="w-full justify-start">
                    <Search className="mr-2 h-4 w-4" />
                    Find Colleges
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Application Tips
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Financial Aid
                  </Button>
                  <Link href="/tutoring-support">
                    <Button variant="ghost" className="w-full justify-start">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Get Tutoring Help
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '600px', maxHeight: '800px' }}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bot className="h-6 w-6 text-blue-600" />
                  <CardTitle>AI College Guidance Assistant</CardTitle>
                </div>
                <CardDescription>
                  Ask me anything about colleges, admissions, or your academic journey!
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col min-h-0">
                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0 pr-4">
                  <div className="space-y-4 pb-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex space-x-2 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>

                          <div className={`rounded-lg px-4 py-2 ${
                            message.sender === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}>
                            <p className="whitespace-pre-wrap">{message.content}</p>

                            {/* College Cards */}
                            {message.colleges && message.colleges.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {message.colleges.map((college) => (
                                  <Card key={college.id} className="bg-white">
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-gray-900">{college.name}</h4>
                                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            <div className="flex items-center">
                                              <MapPin className="h-3 w-3 mr-1" />
                                              {college.location}
                                            </div>
                                            <div className="flex items-center">
                                              <BookOpen className="h-3 w-3 mr-1" />
                                              {college.type}
                                            </div>
                                            <div className="flex items-center">
                                              <DollarSign className="h-3 w-3 mr-1" />
                                              {college.tuition}
                                            </div>
                                            <div className="flex items-center">
                                              <Users className="h-3 w-3 mr-1" />
                                              Acceptance Rate: {college.acceptance_rate}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                          <span className="text-sm font-medium">#{college.ranking}</span>
                                        </div>
                                      </div>
                                      <Button size="sm" className="mt-3 w-full">
                                        Learn More
                                      </Button>
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
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="flex space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-gray-100 rounded-lg px-4 py-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator className="my-4" />

                {/* Message Input */}
                <div className="flex space-x-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me about colleges, admissions, or anything related to your education..."
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
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
