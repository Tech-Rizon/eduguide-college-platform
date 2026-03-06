"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GraduationCap, User, Mail, AtSign, MapPin, Phone, FileText, Edit2, Save, X, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

interface ProfileData {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at?: string | null;
}

interface EditFormState {
  full_name: string;
  username: string;
  phone: string;
  location: string;
  bio: string;
}

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    full_name: "",
    username: "",
    phone: "",
    location: "",
    bio: "",
  });
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;

    setProfileLoading(true);
    setProfileError(null);

    supabase.auth.getSession().then(({ data: sessionData }) => {
      const token = sessionData.session?.access_token;
      if (!token) {
        setProfileLoading(false);
        return;
      }

      fetch("/api/user-profile", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          const payload = await res.json().catch(() => ({})) as { profile?: ProfileData | null; error?: string };
          if (!res.ok) throw new Error(payload.error || "Failed to load profile");
          return payload.profile;
        })
        .then((data) => {
          const resolved: ProfileData = data ?? {
            id: user.id,
            email: user.email ?? null,
            full_name: (user.user_metadata as Record<string, string> | undefined)?.full_name ?? null,
            username: null,
            phone: null,
            location: null,
            bio: null,
            avatar_url: null,
          };
          setProfile(resolved);
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to load profile";
          setProfileError(msg);
        })
        .finally(() => setProfileLoading(false));
    });
  }, [user, loading]);

  const openEdit = () => {
    if (!profile) return;
    setEditError(null);
    setEditForm({
      full_name: profile.full_name ?? "",
      username: profile.username ?? "",
      phone: profile.phone ?? "",
      location: profile.location ?? "",
      bio: profile.bio ?? "",
    });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const saveProfile = async () => {
    if (!user) return;

    const normalizedUsername = editForm.username.trim().toLowerCase();
    if (normalizedUsername && !USERNAME_REGEX.test(normalizedUsername)) {
      setEditError("Username must be 3-30 characters using only letters, numbers, and underscores.");
      return;
    }

    if (editForm.bio.trim().length > 500) {
      setEditError("Bio must be under 500 characters.");
      return;
    }

    setEditError(null);
    setIsSaving(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired. Please log in again.");

      const body: Record<string, string | null> = {
        email: user.email ?? null,
        full_name: editForm.full_name.trim() || null,
        phone: editForm.phone.trim() || null,
        location: editForm.location.trim() || null,
        bio: editForm.bio.trim() || null,
      };
      if (normalizedUsername) body.username = normalizedUsername;
      else body.username = null;

      const res = await fetch("/api/user-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await res.json().catch(() => ({})) as { profile?: ProfileData; error?: string };
      if (!res.ok) throw new Error(payload.error || "Failed to save profile");

      setProfile(payload.profile ?? profile);
      setIsEditing(false);
      toast.success("Profile updated successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      setEditError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 px-6 py-12 flex flex-col items-center">
        <div className="flex items-center space-x-2 mb-8">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">EduGuide</span>
        </div>
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <User className="h-12 w-12 text-gray-400 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900">Sign in to view your profile</h2>
            <p className="text-gray-500 text-sm">
              Access your personal information, username, and tutoring history.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Link href="/login">
                <Button variant="outline" className="w-full sm:w-auto">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button className="w-full sm:w-auto">Create Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const avatarInitials = (
    profile?.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("") ||
    user.email?.slice(0, 2) ||
    "U"
  ).toUpperCase();

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Nav */}
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <GraduationCap className="h-7 w-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">EduGuide</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
          {!isEditing && profile && (
            <Button onClick={openEdit} variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        {profileError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {profileError} —{" "}
            <button
              type="button"
              className="underline"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Avatar + identity card */}
          <Card className="md:col-span-1 flex flex-col items-center py-8 px-4 text-center space-y-4">
            <Avatar className="h-20 w-20 text-2xl">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-bold">
                {avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                {profile?.full_name || "No name set"}
              </p>
              {profile?.username && (
                <Badge variant="secondary" className="mt-1">@{profile.username}</Badge>
              )}
            </div>
            <Separator />
            <div className="text-sm text-gray-500 space-y-1 w-full text-left">
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {user.email}
              </p>
              {profile?.location && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {profile.location}
                </p>
              )}
              {profile?.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {profile.phone}
                </p>
              )}
            </div>
          </Card>

          {/* Main info / edit form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">{isEditing ? "Edit Profile" : "Profile Details"}</CardTitle>
              <CardDescription>
                {isEditing
                  ? "Update your information below and click Save."
                  : "Your publicly visible profile information."}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={editForm.full_name}
                        onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                        maxLength={80}
                        placeholder="Jane Smith"
                        autoComplete="name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username">
                        Username
                        <span className="ml-1 text-xs text-gray-400">(public)</span>
                      </Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                          id="username"
                          value={editForm.username}
                          onChange={(e) =>
                            setEditForm((p) => ({
                              ...p,
                              username: e.target.value.replace(/\s/g, ""),
                            }))
                          }
                          maxLength={30}
                          placeholder="jane_doe"
                          autoComplete="username"
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-gray-400">3-30 chars, letters/numbers/underscores</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                        maxLength={100}
                        placeholder="New York, NY"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editForm.phone}
                        onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                        maxLength={30}
                        placeholder="+1 (555) 000-0000"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bio">
                      Bio
                      <span className="ml-1 text-xs text-gray-400">
                        ({editForm.bio.length}/500)
                      </span>
                    </Label>
                    <textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                      maxLength={500}
                      rows={3}
                      placeholder="Tell us a little about yourself..."
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    />
                  </div>

                  {editError && (
                    <p className="text-sm text-red-600">{editError}</p>
                  )}
                </>
              ) : (
                <div className="space-y-3 text-sm">
                  <InfoRow icon={<User className="h-4 w-4" />} label="Full Name" value={profile?.full_name} />
                  <InfoRow icon={<AtSign className="h-4 w-4" />} label="Username" value={profile?.username ? `@${profile.username}` : null} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={profile?.location} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={profile?.phone} />
                  {profile?.bio && (
                    <div className="flex gap-3 pt-1">
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-gray-500 mb-0.5">Bio</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{profile.bio}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {isEditing && (
              <CardFooter className="flex gap-2 justify-end">
                <Button variant="outline" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button onClick={saveProfile} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Quick links */}
        <Card>
          <CardContent className="pt-6 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">AI Dashboard</Button>
            </Link>
            <Link href="/tutoring-support">
              <Button variant="outline" size="sm">Tutoring Requests</Button>
            </Link>
            <Link href="/colleges">
              <Button variant="outline" size="sm">Browse Colleges</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900 font-medium">
          {value || <span className="text-gray-400 font-normal">Not set</span>}
        </span>
      </div>
    </div>
  );
}
