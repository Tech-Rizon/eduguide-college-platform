"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Colleges page
 *
 * This page acts as a placeholder for the future college discovery feature.
 * It provides a simple introduction and navigation back to the home page.
 */
export default function CollegesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col justify-center items-center p-8 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        Find Colleges
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl">
        Our college discovery tool is coming soon. You’ll be able to explore thousands of community colleges and universities with detailed information and application requirements. In the meantime, please check back later or reach out to our support team if you have any questions.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/" passHref>
          <Button size="lg" variant="outline">
            Back to Home
          </Button>
        </Link>
        <Link href="/demo" passHref>
          <Button size="lg">
            Try Demo Chat
          </Button>
        </Link>
      </div>
    </div>
  );
}