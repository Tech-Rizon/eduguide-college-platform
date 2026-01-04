"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  current_school?: string | null;
};

/**
 * Profile page
 *
 * Displays basic user information fetched from Supabase. If the user is not logged in, they are prompted to sign in.
 */
export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    setProfileLoading(true);
    supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.log("No profile found, using auth user data");
        }
        setProfile(data ? { ...data, email: user.email } : { id: user.id, email: user.email, full_name: user.user_metadata?.full_name });
        setProfileLoading(false);
      });
  }, [user, loading]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
          Your Profile
        </h1>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 px-6 py-12 flex flex-col items-center">
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
        Your Profile
      </h1>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{profile?.full_name || user.email}</CardTitle>
          <CardDescription>Manage your account and update your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Email:</span>
            <span className="text-gray-900">{user.email}</span>
          </div>
          {profile?.current_school && (
            <div className="flex justify-between">
              <span className="font-medium text-gray-700">School:</span>
              <span className="text-gray-900">{profile.current_school}</span>
            </div>
          )}
          <div className="mt-6 text-center">
            <Link href="/tutoring-support" passHref>
              <Button>View Tutoring Requests</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}