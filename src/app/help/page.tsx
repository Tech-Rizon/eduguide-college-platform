"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Help Center page
 *
 * Provides information on how users can get support. Currently a placeholder.
 */
export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Help Center</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl">
        We’re here to help! Our help center is under construction. In the meantime, please reach out via our contact page or explore the FAQ for answers to common questions.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/contact" passHref>
          <Button size="lg" variant="outline">Contact Us</Button>
        </Link>
        <Link href="/faq" passHref>
          <Button size="lg">FAQ</Button>
        </Link>
      </div>
    </div>
  );
}