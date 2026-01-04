"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

/**
 * FAQ page
 *
 * Contains a few frequently asked questions. You can expand this list with more questions as needed.
 */
const faqs = [
  {
    question: "What services does EduGuide provide?",
    answer:
      "EduGuide helps students discover colleges, connect with our AI assistant for guidance, and access personalized tutoring and academic support."
  },
  {
    question: "How do I get started?",
    answer:
      "Simply create an account by clicking the ‘Get Started’ button on the home page, then complete your profile to begin receiving recommendations."
  },
  {
    question: "Is EduGuide free to use?",
    answer:
      "You can try our AI assistant for free via the demo chat. For personalized tutoring support, we offer a range of paid plans starting at $25/hr."
  },
  {
    question: "Do I need to be logged in to submit tutoring requests?",
    answer:
      "Yes. Submitting a tutoring request requires an account so we can match you with the right tutor and keep track of your sessions."
  },
];

export default function FAQPage() {
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

      <div className="max-w-3xl mx-auto px-6 py-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 text-center"
        >
          Frequently Asked Questions
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-6"
        >
        {faqs.map((faq, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{faq.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{faq.answer}</p>
            </CardContent>
          </Card>
        ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-12 text-center p-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg"
        >
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="mb-6 text-lg opacity-90">We're here to help. Get in touch with our support team.</p>
          <Link href="/contact">
            <Button variant="secondary" size="lg">Contact Us</Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}