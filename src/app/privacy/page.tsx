"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Privacy Policy page
 *
 * Contains a basic privacy policy template. For real deployment, replace with your actual policy.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-center">Privacy Policy</h1>
        <p className="text-gray-700 mb-4">
          At EduGuide, we respect your privacy and are committed to protecting your personal information. This
          privacy policy explains how we collect, use, and safeguard your data when you use our platform. By
          using EduGuide, you consent to the collection and use of information in accordance with this policy.
        </p>
        <h2 className="text-2xl font-semibold mb-2">Information We Collect</h2>
        <p className="text-gray-700 mb-4">
          We may collect personal information such as your name, email address, and academic details when you
          create an account or submit a tutoring request. We also collect usage data and analytics to improve
          our services.
        </p>
        <h2 className="text-2xl font-semibold mb-2">How We Use Your Information</h2>
        <p className="text-gray-700 mb-4">
          Your information is used to provide personalized college recommendations, facilitate tutoring services,
          communicate with you about your account, and improve our platform. We do not sell your personal
          information to third parties.
        </p>
        <h2 className="text-2xl font-semibold mb-2">Data Security</h2>
        <p className="text-gray-700 mb-4">
          We employ industry-standard security measures to protect your data. Despite our efforts, please be
          aware that no method of transmission over the internet or electronic storage is completely secure.
        </p>
        <h2 className="text-2xl font-semibold mb-2">Changes to This Policy</h2>
        <p className="text-gray-700 mb-4">
          We may update our privacy policy from time to time. Any changes will be posted on this page with an
          updated effective date. We encourage you to review this policy periodically.
        </p>
        <div className="mt-8 text-center">
          <Link href="/contact" passHref>
            <Button variant="outline">Contact Us About Privacy</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}