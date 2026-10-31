"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowLeft,
  Copy,
  CheckCheck,
  Gift,
  Users,
  TrendingUp,
  Share2,
  ExternalLink,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";

interface ReferralData {
  code: string;
  shareUrl: string;
  clicks: number;
}

interface ReferralHistoryRow {
  id: string;
  status: string;
  referee_email: string | null;
  created_at: string;
  qualified_at: string | null;
  rewarded_at: string | null;
  reward_expires_at: string | null;
}

interface ReferralStats {
  totalReferrals: number;
  converted: number;
  activeReward: {
    discountPercent: number;
    expiresAt: string;
    couponId: string;
  } | null;
  history: ReferralHistoryRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  qualified: "bg-blue-100 text-blue-700",
  rewarded:  "bg-green-100 text-green-700",
  reversed:  "bg-red-100 text-red-700",
  converted: "bg-teal-100 text-teal-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  qualified: "In Hold",
  rewarded:  "Rewarded",
  reversed:  "Reversed",
  converted: "Converted",
};

export default function ReferralDashboardPage() {
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const fetchData = useCallback(async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [refRes, statsRes] = await Promise.all([
      fetch("/api/referral", { headers }),
      fetch("/api/referral/stats", { headers }),
    ]);

    if (refRes.ok) {
      setReferral(await refRes.json());
    }
    if (statsRes.ok) {
      setStats(await statsRes.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session) {
      router.push("/login");
      return;
    }
    fetchData(session.access_token);
  }, [authLoading, session, router, fetchData]);

  const copyCode = async () => {
    if (!referral?.code) return;
    await navigator.clipboard.writeText(referral.code.toUpperCase());
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!referral?.shareUrl) return;
    await navigator.clipboard.writeText(referral.shareUrl);
    setCopiedLink(true);
    toast.success("Share link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareNative = async () => {
    if (!referral) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join EduGuide — 30% off your first month",
          text: `Use my referral code ${referral.code.toUpperCase()} for 30% off your first month of EduGuide tutoring!`,
          url: referral.shareUrl,
        });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your referral dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 max-w-4xl mx-auto">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <GraduationCap className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-bold text-gray-900">EduGuide</span>
        </Link>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Refer & Earn</h1>
          <p className="text-gray-600 text-lg">
            Share EduGuide with friends. They get 30% off their first month — you earn 20% off yours for 3 months.
          </p>
        </motion.div>

        {/* Active reward banner */}
        {stats?.activeReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <Card className="border-green-300 bg-green-50">
              <CardContent className="pt-5 flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Gift className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-green-800 text-lg">
                    {stats.activeReward.discountPercent}% discount active on your subscription
                  </p>
                  <p className="text-green-700 text-sm">
                    Valid until {formatDate(stats.activeReward.expiresAt)} —{" "}
                    <span className="font-medium">{daysUntil(stats.activeReward.expiresAt)} days remaining</span>
                  </p>
                </div>
                <Badge className="bg-green-600 text-white shrink-0">Active</Badge>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <Card>
            <CardContent className="pt-5 text-center">
              <Users className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats?.totalReferrals ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">Invited</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats?.converted ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">Converted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-center">
              <Clock className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">
                {stats?.activeReward ? `${stats.activeReward.discountPercent}%` : "—"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Active Reward</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral code card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6"
        >
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-xl">Your Referral Code</CardTitle>
              <CardDescription>
                Share this code or link — anyone who uses it gets 30% off their first month.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Code display */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-5 py-4">
                  <span className="text-2xl font-mono font-bold tracking-widest text-blue-700 select-all">
                    {referral?.code.toUpperCase() ?? "—"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCode}
                  className="h-14 w-14 shrink-0"
                  title="Copy code"
                >
                  {copied ? (
                    <CheckCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Share link */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 overflow-hidden">
                  <span className="text-sm text-gray-600 truncate block">{referral?.shareUrl ?? "—"}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyLink}
                  className="shrink-0"
                  title="Copy link"
                >
                  {copiedLink ? (
                    <CheckCheck className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copy link
                </Button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <Button onClick={shareNative} className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Now
                </Button>
                {referral?.shareUrl && (
                  <Button asChild variant="outline">
                    <a href={referral.shareUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Preview
                    </a>
                  </Button>
                )}
              </div>

              {referral && (
                <p className="text-xs text-gray-400 pt-1">
                  Your link has been clicked {referral.clicks} time{referral.clicks !== 1 ? "s" : ""}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {[
                  {
                    step: "1",
                    color: "bg-blue-100 text-blue-700",
                    title: "Share your link",
                    desc: "Send your unique referral link to a friend who needs academic support.",
                  },
                  {
                    step: "2",
                    color: "bg-purple-100 text-purple-700",
                    title: "They subscribe",
                    desc: "Your friend signs up for any EduGuide plan and gets 30% off their first month.",
                  },
                  {
                    step: "3",
                    color: "bg-green-100 text-green-700",
                    title: "You earn a reward",
                    desc: "After a 14-day confirmation window you automatically receive 20% off your own subscription for 3 months.",
                  },
                ].map(({ step, color, title, desc }) => (
                  <li key={step} className="flex items-start gap-4">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}
                    >
                      {step}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">{title}</p>
                      <p className="text-sm text-gray-600">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral history */}
        {stats && stats.history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Referral History</CardTitle>
                <CardDescription>All referrals you have sent, newest first.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-4 font-medium">Date</th>
                        <th className="pb-2 pr-4 font-medium">Referred</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Reward</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {stats.history.map((row) => (
                        <tr key={row.id} className="py-2">
                          <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                            {formatDate(row.created_at)}
                          </td>
                          <td className="py-2 pr-4 text-gray-700 max-w-40 truncate">
                            {row.referee_email ?? "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[row.status] ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {STATUS_LABELS[row.status] ?? row.status}
                            </span>
                          </td>
                          <td className="py-2 text-gray-600 text-xs whitespace-nowrap">
                            {row.status === "rewarded" && row.reward_expires_at
                              ? `20% off until ${formatDate(row.reward_expires_at)}`
                              : row.status === "qualified"
                              ? "Hold — reward pending"
                              : row.status === "reversed"
                              ? "Reversed"
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
