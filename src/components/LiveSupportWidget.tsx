"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, X, Send, Bot, User, MinusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SupportMessage {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
}

const autoResponses: Record<string, string> = {
  greeting: "Hello! Welcome to EduGuide Live Support. I'm here to help you with any questions about our services, college recommendations, tutoring, or account issues. How can I assist you today?",
  tutoring: "We offer three tutoring plans:\n\n- **Basic**: $25/hr - 1-on-1 sessions & homework help\n- **Premium**: $45/hr - Includes application support & essay help\n- **Elite**: $75/hr - Dedicated coach, career planning & 24/7 support\n\nWould you like to learn more about any specific plan? Visit /tutoring to get started!",
  account: "For account issues, you can:\n\n1. **Reset password**: Visit /forgot-password\n2. **Update profile**: Go to /profile after logging in\n3. **Change settings**: Access /profile for preferences\n\nIf you're still having trouble, please describe your issue and I'll help!",
  ai: "Our AI college advisor analyzes your GPA, location, preferred major, budget, and demographics to match you with the best-fit schools from our database of 40+ institutions.\n\nTry it at /demo (no login needed) or /dashboard (full features). Just type something like 'My GPA is 3.2 and I want to study nursing in Texas'!",
  colleges: "You can explore our college database at /colleges with search and filter options for:\n\n- State/location\n- School type (Community College, University, HBCU)\n- Tuition budget\n- Majors offered\n\nOr use our AI advisor at /dashboard for personalized recommendations!",
  pricing: "EduGuide's core features are **free**:\n\n- AI college matching\n- College discovery database\n- Financial aid guidance\n- Community college info\n\nPaid services include tutoring ($25-$75/hr) and premium essay review. Visit /tutoring for details!",
  default: "Thank you for your message! Let me help you with that.\n\nHere are some things I can assist with:\n- **College recommendations** - Ask about our AI advisor\n- **Tutoring plans** - Get academic support\n- **Account issues** - Password reset, profile updates\n- **Financial aid** - FAFSA, scholarships, grants\n\nPlease share more details so I can give you the best help!"
};

function getAutoResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.match(/\b(hello|hi|hey|help|support)\b/)) return autoResponses.greeting;
  if (lower.match(/\b(tutor|tutoring|session|plan|pricing|price|cost|pay)\b/)) return autoResponses.tutoring;
  if (lower.match(/\b(account|password|login|sign in|profile|setting)\b/)) return autoResponses.account;
  if (lower.match(/\b(ai|recommend|match|advisor|gpa|chat bot)\b/)) return autoResponses.ai;
  if (lower.match(/\b(college|university|school|find|search|database)\b/)) return autoResponses.colleges;
  if (lower.match(/\b(free|pricing|subscription|money)\b/)) return autoResponses.pricing;

  return autoResponses.default;
}

export default function LiveSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: "welcome",
        content: "Hi there! Welcome to EduGuide Live Support. How can I help you today? I can assist with college recommendations, tutoring plans, account questions, and more!",
        sender: "agent",
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMsg: SupportMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getAutoResponse(currentInput);
      const agentMsg: SupportMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "agent",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);

      if (!isOpen || isMinimized) {
        setUnread(prev => prev + 1);
      }
    }, 1000 + Math.random() * 500);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setIsMinimized(false);
    if (!isOpen) setUnread(0);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4"
          >
            <Card className="w-80 sm:w-96 shadow-2xl border-blue-200">
              <CardHeader className="bg-blue-600 text-white rounded-t-lg py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Headphones className="h-4 w-4" />
                    Live Support
                    <Badge variant="secondary" className="bg-green-500 text-white text-xs">Online</Badge>
                  </CardTitle>
                  <div className="flex gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-blue-700 rounded">
                      <MinusCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-blue-700 rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Messages */}
                <div className="h-72 overflow-y-auto p-3 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.sender === "user" ? "bg-blue-100" : "bg-green-100"
                        }`}>
                          {msg.sender === "user"
                            ? <User className="h-3 w-3 text-blue-600" />
                            : <Headphones className="h-3 w-3 text-green-600" />
                          }
                        </div>
                        <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
                          msg.sender === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex gap-2">
                      <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Headphones className="h-3 w-3 text-green-600" />
                      </div>
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t p-3">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your question..."
                      className="text-xs h-8"
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button size="sm" className="h-8 px-3" onClick={sendMessage} disabled={!input.trim()}>
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Powered by EduGuide Support
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
        className="relative h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Headphones className="h-6 w-6" />
        )}
        {unread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            {unread}
          </span>
        )}
      </motion.button>
    </div>
  );
}
