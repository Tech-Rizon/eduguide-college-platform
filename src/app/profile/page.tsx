"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

/**
 * Profile page
 *
 * Displays basic user information fetched from Supabase. If the user is not logged in, they are prompted to sign in.
 */
export default function ProfilePage() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12 flex flex-col items-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
        Your Profile
      </h1>
      {!user ? (
        <div className="text-center max-w-lg">
          <p className="text-lg text-gray-600 mb-6">
            You need to be logged in to view your profile. Please sign in or create an account to access your personal information and tutoring requests.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login" passHref>
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
            <Link href="/register" passHref>
              <Button size="lg">Create Account</Button>
            </Link>
          </div>
        </div>
      ) : (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">{user.full_name || user.email}</CardTitle>
            <CardDescription>Manage your account and update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">Email:</span>
              <span className="text-gray-900">{user.email}</span>
            </div>
            {/* Additional profile fields could be displayed here */}
            <div className="mt-6 text-center">
              <Link href="/tutoring-support" passHref>
                <Button>View Tutoring Requests</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}