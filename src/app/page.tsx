"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, MessageCircle, Search, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2"
        >
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-4"
        >
          <Link href="/tutoring">
            <Button variant="ghost">Tutoring</Button>
          </Link>
          <Link href="/tutoring-support">
            <Button variant="ghost">Get Help</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
          >
            Your College Journey
            <span className="block text-blue-600">Starts Here</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
          >
            Get personalized guidance, discover the perfect college, and chat with our AI assistant to navigate your educational future with confidence.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Try Demo Chat
                <MessageCircle className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid md:grid-cols-3 gap-8 mt-20"
        >
          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-blue-600">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <MessageCircle className="h-6 w-6 text-blue-600" />
                <CardTitle>AI-Powered Guidance</CardTitle>
              </div>
              <CardDescription>Personalized college advice</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Chat with our intelligent assistant to get tailored recommendations based on your goals, interests, and academic profile.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-green-600">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Search className="h-6 w-6 text-green-600" />
                <CardTitle>College Discovery</CardTitle>
              </div>
              <CardDescription>Explore thousands of options</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Search through 5,000+ community colleges and universities to find institutions that match your needs and aspirations.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-purple-600">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-6 w-6 text-purple-600" />
                <CardTitle>Personalized Support</CardTitle>
              </div>
              <CardDescription>Expert guidance every step</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Get tailored advice on applications, essays, test prep, and more from our team of college counselors.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 text-center"
        >
          <div className="p-6 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">5000+</div>
            <div className="text-gray-600">Colleges & Universities</div>
          </div>
          <div className="p-6 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
            <div className="text-gray-600">AI Assistant Available</div>
          </div>
          <div className="p-6 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-2">95%</div>
            <div className="text-gray-600">Student Satisfaction</div>
          </div>
          <div className="p-6 bg-orange-50 rounded-lg">
            <div className="text-3xl font-bold text-orange-600 mb-2">10k+</div>
            <div className="text-gray-600">Students Helped</div>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mt-20"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Your Profile</h3>
              <p className="text-gray-600">
                Tell us about your academic goals, interests, and preferences to personalize your experience.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chat with AI</h3>
              <p className="text-gray-600">
                Get instant personalized recommendations and guidance on colleges that match your profile.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Apply & Succeed</h3>
              <p className="text-gray-600">
                Get support throughout your application process and make informed decisions about your future.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white mt-20"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Find Your Perfect College?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of students who've already found their ideal college with EduGuide. Start your journey today.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Get Started for Free
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold text-white">EduGuide</span>
              </div>
              <p className="text-sm text-gray-400">
                Your AI-powered guide to finding the perfect college and achieving your educational goals.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/chat" className="hover:text-blue-400 transition">
                    AI Chat
                  </Link>
                </li>
                <li>
                  <Link href="/colleges" className="hover:text-blue-400 transition">
                    College Search
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-blue-400 transition">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/help" className="hover:text-blue-400 transition">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-blue-400 transition">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-blue-400 transition">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-blue-400 transition">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-blue-400 transition">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-blue-400 transition">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-sm text-gray-400 text-center">
            <p>&copy; 2025 EduGuide. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
