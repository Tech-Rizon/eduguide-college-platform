"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * AI Assistant landing page
 *
 * This page acts as a simple wrapper that directs users to either the demo chat or the full dashboard depending on authentication.
 * Because authentication is handled client-side, the page simply offers two options for now.
 */
export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
        AI Assistant
      </h1>
      <p className="text-lg text-gray-600 mb-8 max-w-2xl">
        Chat with our intelligent assistant to get personalized college recommendations and academic advice.
        If you’re not logged in, you can try the demo chat with a few free messages. Logged in users will be redirected to their dashboard.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/demo" passHref>
          <Button size="lg" variant="outline">Try Demo Chat</Button>
        </Link>
        <Link href="/dashboard" passHref>
          <Button size="lg">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}