"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Terms of Service page
 *
 * Contains a basic terms of service template. Replace with your actual terms before deploying.
 */
export default function TermsPage() {
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
        </div>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto px-6 py-12"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-center">Terms of Service</h1>
        <p className="text-gray-700 mb-4">
          These Terms of Service govern your use of EduGuide. By accessing or using our platform, you agree
          to be bound by these terms. If you do not agree with any part of the terms, you may not use our
          services.
        </p>
        <h2 className="text-2xl font-semibold mb-2">Use of Our Services</h2>
        <p className="text-gray-700 mb-4">
          You agree to use EduGuide only for lawful purposes and in accordance with these terms. You will not
          use the platform in any manner that could disable, overburden, or impair the site or interfere with
          any other party’s use of EduGuide.
        </p>
        <h2 className="text-2xl font-semibold mb-2">User Accounts</h2>
        <p className="text-gray-700 mb-4">
          When you create an account, you must provide accurate and complete information. You are responsible
          for maintaining the confidentiality of your account and password and for all activities that occur
          under your account.
        </p>
        <h2 className="text-2xl font-semibold mb-2">Limitation of Liability</h2>
        <p className="text-gray-700 mb-4">
          EduGuide and its affiliates will not be liable for any indirect, incidental, special, consequential,
          or punitive damages arising from your use of the platform.
        </p>
        <h2 className="text-2xl font-semibold mb-2">Changes to These Terms</h2>
        <p className="text-gray-700 mb-4">
          We may modify these terms at any time. We will notify you of changes by posting the updated terms
          on this page. Your continued use of EduGuide constitutes acceptance of the updated terms.
        </p>
        <div className="mt-8 text-center">
          <Link href="/contact">
            <Button variant="outline">Contact Us About Terms</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}