"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Search, Zap, MapPin } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Colleges page
 *
 * This page acts as a placeholder for the future college discovery feature.
 * It provides a simple introduction and navigation back to the home page.
 */
export default function CollegesPage() {
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
            Find Colleges
            <span className="block text-blue-600">Coming Soon</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Our college discovery tool is coming soon. You'll be able to explore thousands of community colleges and universities with detailed information and application requirements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Home
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" className="text-lg px-8 py-6">
                Try Demo Chat
                <Zap className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Features Coming Soon */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid md:grid-cols-3 gap-8 mt-12"
        >
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Smart Search</CardTitle>
              <CardDescription>Find colleges that match your criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Search by location, program, cost, and more to find schools that fit your goals.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Detailed Info</CardTitle>
              <CardDescription>Complete college information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">View admission requirements, tuition, programs, campus facilities, and student reviews.</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>Personalized college matches</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Our AI analyzes your profile and recommends colleges that align with your interests.</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}