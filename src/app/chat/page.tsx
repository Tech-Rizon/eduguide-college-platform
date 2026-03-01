"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, MessageCircle, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

/**
 * AI Assistant landing page
 *
 * This page acts as a simple wrapper that directs users to either the demo chat or the full dashboard depending on authentication.
 * Because authentication is handled client-side, the page simply offers two options for now.
 */
export default function ChatPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
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
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Research-Backed AI
            <span className="block text-blue-600">Your Personal College and Study Guide</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Chat with an inquisitive assistant that matches schools to your profile, checks official school information, and helps with academic planning.
            Logged-in students also unlock free assignment support: prompt breakdowns, explanations, outlines, and draft feedback.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/demo">
              <Button size="lg" className="text-lg px-8 py-6">
                Try Demo Chat
                <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Go to Dashboard
                <BookOpen className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid md:grid-cols-2 gap-8"
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Try Demo</CardTitle>
              <CardDescription>No login required</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Experience the AI with a free demo chat. Ask about colleges, admissions, budget, school fit, and shortlist strategy.</p>
              <Link href="/demo">
                <Button variant="outline" className="w-full">Start Demo Chat</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Full Dashboard</CardTitle>
              <CardDescription>For registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Sign in for full AI support, saved school research, personalized recommendations, and free assignment help built around your actual coursework.</p>
              <Link href="/dashboard">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
