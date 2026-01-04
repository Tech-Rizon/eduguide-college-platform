"use client";

// Help page modeled after the Tutoring page layout
// This component uses a similar structure (navigation, hero section, information cards, and CTA)
// to provide a cohesive look and feel across the EduGuide platform.

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GraduationCap,
  ArrowLeft,
  Mail,
  Phone,
  Info,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";

// Sample FAQs to display on the Help page. These can be replaced with real content.
const faqs = [
  {
    question: "How do I reset my password?",
    answer:
      "Click the 'Forgot password?' link on the login page and follow the instructions to reset your password.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach our support team via email at support@eduguide.online or by visiting the contact page to submit your question.",
  },
  {
    question: "Where can I find tutorials?",
    answer:
      "Our tutorials are available under the Resources section on the dashboard once you're logged in.",
  },
];

export default function HelpPage() {
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Need Assistance?
            <span className="block text-blue-600">We're Here to Help</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Whether you have questions about using EduGuide, need help with your account, or just want to know more
            about our services, our support team is ready to assist you. Explore our FAQs or get in touch directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="text-lg px-8 py-6">
                Contact Us
                <Mail className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/faq">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Visit FAQ
                <Info className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Information Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          {/* Contact Information */}
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pt-6">
              <div className="flex justify-center mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Send us a message and we’ll respond within 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You can reach our support team by visiting our contact page. We’re here to answer
                your questions and help resolve any issues.
              </p>
              {/* Link to the contact page defined on the home page */}
              <Link href="/contact">
                <Button>Contact Page</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Phone Support */}
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pt-6">
              <div className="flex justify-center mb-4">
                <Phone className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Call Us</CardTitle>
              <CardDescription>Speak with a support representative</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Our support team is available Monday – Friday, 9am – 5pm. For immediate assistance,
                please visit our contact page.
              </p>
              {/* Link to the contact page defined on the home page */}
              <Link href="/contact">
                <Button>Contact Us</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Community & Resources */}
          <Card className="text-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="pt-6">
              <div className="flex justify-center mb-4">
                <MessageCircle className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Join the Community</CardTitle>
              <CardDescription>Connect with fellow students and our team</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Want to discover more resources? Explore our college listings or chat with our AI assistant to learn more.
              </p>
              {/* Link to the routes defined on the home page */}
              <Link href="/colleges">
                <Button>Find Colleges</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-4xl mx-auto space-y-8">
            {faqs.map((faq) => (
              <Card key={faq.question} className="hover:shadow-md transition-shadow duration-300">
                <CardHeader>
                  <CardTitle>{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">Still Need Help?</h2>
          <p className="text-xl mb-8 opacity-90">
            If your question isn’t answered here, feel free to get in touch with our support team directly. We’re
            committed to helping you make the most of EduGuide.
          </p>
          <Link href="/contact">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Contact Support
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
