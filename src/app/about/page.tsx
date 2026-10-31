"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

/**
 * About page
 *
 * Shares information about the mission and vision of EduGuide. Feel free to customize this content further.
 */
export default function AboutPage() {
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

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">About EduGuide</h1>
        <p className="text-lg text-gray-600 mb-8">
          EduGuide is a platform built by educators, engineers, and students dedicated to helping learners find
          the right college and excel academically. We believe every student deserves personalized guidance on
          their educational journey. Our mission is to make that guidance accessible and affordable.
        </p>
        <p className="text-lg text-gray-600 mb-8">
          Our AI assistant and network of certified tutors provide tailored recommendations and support at every stage
          — from choosing a school to crafting a standout application, staying on top of coursework, and preparing for
          your future career.
        </p>
        <p className="text-lg text-gray-600 mb-12">
          If you share our vision or would like to partner with us, please don't hesitate to get in touch.
        </p>
        <div className="flex justify-center">
          <Link href="/contact">
            <Button size="lg">Contact Us</Button>
          </Link>
        </div>
        </motion.div>
      </div>
    </div>
  );
}