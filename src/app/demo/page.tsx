"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Info
} from "lucide-react";
import Link from "next/link";

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

export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: "welcome",
      content: `Welcome to the EduGuide AI Demo! 🎓

I'm your AI college guidance assistant. In this demo, you can ask me about:

• Finding colleges in different states
• Learning about admission requirements
• Understanding financial aid options
• Exploring community colleges vs universities
• Getting general college advice

Try asking me something like "What colleges are good in California?" or "Tell me about financial aid"

Note: This is a limited demo. Create an account for the full experience with personalized recommendations!`,
      sender: "ai",
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Use setTimeout to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const simulateAIResponse = (userMessage: string): { content: string; colleges?: College[] } => {
    const message = userMessage.toLowerCase();

    // Check if this is a greeting or general inquiry - ask personalization questions
    if (message.includes("hello") || message.includes("hi") || message.includes("help") || messages.length <= 2) {
      return {
        content: `Hi there! I'd love to help you find the perfect college. To give you the best recommendations, could you tell me:

1. **Where are you located?** (City, State)
2. **Are you looking for Universities or Community Colleges?**
3. **What's your preferred field of study?** (if you know)
4. **What's your approximate budget for tuition?**

Feel free to answer any or all of these questions, and I'll provide personalized recommendations!

*Note: Create an account for even more detailed guidance based on your complete academic profile.*`
      };
    }

    if (message.includes("california") || message.includes("ca") || message.includes("west coast")) {
      return {
        content: "Great choice! California has excellent educational opportunities. Here are some colleges in California that might interest you:",
        colleges: sampleColleges
      };
    }

    if (message.includes("computer science") || message.includes("engineering") || message.includes("tech")) {
      return {
        content: `Excellent choice! Computer Science and Engineering are in high demand. Before I recommend specific programs, could you tell me:

• **What's your current location or preferred state?**
• **Are you interested in research universities or more practical/applied programs?**
• **Do you prefer large universities or smaller colleges?**

Here are some top CS/Engineering programs to consider:`,
        colleges: sampleColleges.slice(0, 2)
      };
    }

    if (message.includes("community college") || message.includes("affordable") || message.includes("cheap") || message.includes("budget")) {
      return {
        content: `Smart thinking! Community colleges are an excellent and affordable way to start your education. To help you find the best options:

• **What city/state are you in?** (for local options)
• **What do you plan to study?**
• **Are you planning to transfer to a 4-year university later?**

Here's an example of an excellent community college:`,
        colleges: [sampleColleges[1]]
      };
    }

    if (message.includes("requirements") || message.includes("admission") || message.includes("apply")) {
      return {
        content: `Great question! Admission requirements vary by school type and your background. To give you specific guidance:

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

Create an account for personalized admission strategy based on your specific situation!`
      };
    }

    if (message.includes("financial aid") || message.includes("scholarship") || message.includes("money") || message.includes("cost")) {
      return {
        content: `I'd love to help with financial aid! To give you the most relevant information:

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

Register for personalized scholarship search and FAFSA guidance!`
      };
    }

    // Location-based responses
    if (message.includes("texas") || message.includes("tx")) {
      return {
        content: `Texas has fantastic educational opportunities! To help narrow down your options:

• **What part of Texas?** (Dallas, Houston, Austin, San Antonio, etc.)
• **Looking for universities or community colleges?**
• **Interested in any specific programs?**

Texas has excellent public universities like UT Austin, Texas A&M, and many great community colleges with affordable tuition for residents.`
      };
    }

    if (message.includes("new york") || message.includes("ny")) {
      return {
        content: `New York offers incredible educational diversity! A few questions to help:

• **NYC area or upstate New York?**
• **Preferred program of study?**
• **Budget considerations?** (NYC can be expensive)

NY has world-class universities like Columbia, NYU, Cornell, plus excellent SUNY and CUNY systems for more affordable options.`
      };
    }

    if (message.includes("florida") || message.includes("fl")) {
      return {
        content: `Florida has great schools and no state income tax! To help you choose:

• **What area of Florida interests you?**
• **Beach proximity important?**
• **Looking for large research universities or smaller colleges?**

Florida has University of Florida, Florida State, plus excellent community colleges throughout the state.`
      };
    }

    // Default responses with follow-up questions
    const responses = [
      `That's a great question! To give you the best answer, could you share:

• **Your current location** (for regional recommendations)
• **Your main academic interests**
• **Whether you prefer universities or community colleges**

I'd love to help you find the perfect fit! Create an account for even more personalized guidance.`,

      `I'd be happy to help with that! A few quick questions to personalize my recommendations:

• **What state are you in?**
• **What do you want to study?**
• **Any preference for school size or setting?**

With a full account, I can provide detailed matches based on your complete academic profile!`,

      `Excellent question! To give you the most helpful information:

• **Where are you looking to go to school?**
• **What's your academic background?**
• **Any specific career goals?**

Register to access our complete database and get AI-powered recommendations tailored just for you!`
    ];

    return {
      content: responses[Math.floor(Math.random() * responses.length)]
    };
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Limit demo to 5 messages
    if (messageCount >= 5) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "Demo limit reached! Create an account to continue chatting with unlimited messages and get personalized recommendations.",
        sender: "ai",
        timestamp: new Date(),
      }]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    setMessageCount(prev => prev + 1);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
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
        {/* Demo Notice */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> You can send up to 5 messages in this demo.
            <Link href="/register" className="text-blue-600 hover:underline ml-1">
              Create an account
            </Link> for unlimited access and personalized recommendations!
          </AlertDescription>
        </Alert>

        <Card className="flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px', maxHeight: '700px' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="h-6 w-6 text-blue-600" />
                <CardTitle>AI College Guidance Assistant - Demo</CardTitle>
              </div>
              <div className="text-sm text-gray-500">
                Messages: {messageCount}/5
              </div>
            </div>
            <CardDescription>
              Try our AI assistant and see how it can help with your college journey!
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
                                  <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                    💡 Create an account to get detailed info and apply!
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
                placeholder={messageCount >= 5 ? "Demo limit reached - create an account to continue!" : "Try asking: 'What colleges are good in California?'"}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                disabled={isTyping || messageCount >= 5}
              />
              <Button
                onClick={sendMessage}
                disabled={isTyping || !inputMessage.trim() || messageCount >= 5}
              >
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

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white"
        >
          <h2 className="text-2xl font-bold mb-4">Ready for the Full Experience?</h2>
          <p className="text-lg mb-6 opacity-90">
            Create your account to get unlimited AI assistance, personalized recommendations, and access to our complete college database.
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
