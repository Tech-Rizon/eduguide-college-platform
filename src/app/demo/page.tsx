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
import { processMessage, type UserProfile } from "@/lib/aiEngine";
import type { CollegeEntry } from "@/lib/collegeDatabase";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  colleges?: CollegeEntry[];
}

function createMessageId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{
      id: "welcome",
      content: `Welcome to the EduGuide AI Assistant Demo!\n\nI'm a smart college guidance advisor that can match you with the best schools based on your profile. Try me out!\n\n**Here's what I can do:**\n- Match colleges based on your GPA, location, and interests\n- Advise on financial aid and scholarships\n- Guide you through admission requirements\n- Compare community colleges and universities\n\n**Try saying:**\n- "My GPA is 3.0 and I'm in Texas"\n- "I want to study computer science in California"\n- "What affordable community colleges are available?"\n- "Tell me about universities"\n\nCreate an account for unlimited access and saved preferences!`,
      sender: "ai",
      timestamp: new Date(),
    }]);
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

  const sendMessage = async () => {
    if (isTyping || !inputMessage.trim()) return;

    if (messageCount >= 5) {
      setMessages(prev => [...prev, {
        id: createMessageId("ai-limit"),
        content: "You've reached the demo limit of 5 messages. Create a free account to get unlimited AI guidance, save your profile, and access our full college database!",
        sender: "ai",
        timestamp: new Date(),
      }]);
      return;
    }

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
    setMessageCount(prev => prev + 1);

    window.setTimeout(() => {
      try {
        const aiResponse = processMessage(currentInput, userProfile);

        if (aiResponse.profileUpdates) {
          setUserProfile(prev => ({ ...prev, ...aiResponse.profileUpdates }));
        }

        const aiMessage: Message = {
          id: createMessageId("ai"),
          content: aiResponse.content,
          sender: "ai",
          timestamp: new Date(),
          colleges: aiResponse.colleges,
        };

        setMessages(prev => [...prev, aiMessage]);
      } catch {
        setMessages(prev => [...prev, {
          id: createMessageId("ai-error"),
          content: "I ran into an issue generating that response. Please try again.",
          sender: "ai",
          timestamp: new Date(),
        }]);
      } finally {
        setIsTyping(false);
      }
    }, 800 + Math.random() * 700);
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
            <strong>Demo Mode:</strong> You can send up to 5 messages. The AI will analyze your GPA, location, and interests to recommend schools.
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
                <CardTitle>AI College Guidance - Demo</CardTitle>
                <Badge variant="secondary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Smart Matching
                </Badge>
              </div>
              <div className="shrink-0 text-sm text-gray-500">
                Messages: {messageCount}/5
              </div>
            </div>
            <CardDescription>
              Try our AI: share your GPA, location, and goals for personalized college matches!
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
                          <span className="text-xs text-gray-500 mr-2">Analyzing...</span>
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
                placeholder={messageCount >= 5 ? "Demo limit reached - create an account!" : 'Try: "My GPA is 3.5 and I want to study nursing"'}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                disabled={isTyping || messageCount >= 5}
              />
              <Button className="shrink-0" onClick={sendMessage} disabled={isTyping || !inputMessage.trim() || messageCount >= 5}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {messageCount >= 3 && messageCount < 5 && (
              <div className="mt-2 text-center">
                <p className="text-sm text-orange-600">
                  Only {5 - messageCount} messages left in demo.{" "}
                  <Link href="/register" className="text-blue-600 hover:underline">
                    Create account for unlimited access!
                  </Link>
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
            Create your account for unlimited AI assistance, saved preferences, and access to our complete college database with 40+ institutions.
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
    </div>
  );
}
