"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, Users, AlertTriangle, ShieldCheck } from "lucide-react";

const sampleQueue = [
  { student: "Avery M.", request: "Essay review + structure pass", priority: "high", eta: "20m" },
  { student: "Jordan K.", request: "SAT math tutoring", priority: "medium", eta: "45m" },
  { student: "Riley P.", request: "Financial aid Q&A", priority: "low", eta: "1h" },
];

export default function StaffDashboardPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<string>("student");
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/staff/dashboard");
      return;
    }

    const resolveRole = async () => {
      if (!session?.access_token) {
        setRoleLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/user-role", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = await response.json();
        const resolvedRole = payload?.role ?? "student";
        setRole(resolvedRole);

        if (!["tutor", "staff", "admin"].includes(resolvedRole)) {
          router.replace("/dashboard");
        }
      } catch {
        router.replace("/dashboard");
      } finally {
        setRoleLoading(false);
      }
    };

    if (user) {
      resolveRole();
    }
  }, [loading, router, session?.access_token, user]);

  const isPrivileged = useMemo(() => ["tutor", "staff", "admin"].includes(role), [role]);

  if (loading || roleLoading || !isPrivileged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Loading secure staff workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Secure Staff/Tutor/Admin Area</Badge>
            </div>
            <h1 className="text-3xl font-bold">Operations Command Dashboard</h1>
            <p className="text-slate-300 mt-1">Monitor tutoring operations, response SLAs, and student support delivery.</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Student View
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Active Students" value="124" subtitle="+8 this week" icon={<Users className="h-5 w-5 text-blue-300" />} />
          <MetricCard title="Open Support Requests" value="17" subtitle="4 high priority" icon={<AlertTriangle className="h-5 w-5 text-amber-300" />} />
          <MetricCard title="Sessions Today" value="39" subtitle="92% attendance" icon={<Clock3 className="h-5 w-5 text-violet-300" />} />
          <MetricCard title="Completion Rate" value="96.4%" subtitle="Target: 95%" icon={<BarChart3 className="h-5 w-5 text-emerald-300" />} />
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Live Support Queue</CardTitle>
            <CardDescription className="text-slate-400">Prioritized requests requiring tutor/staff action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sampleQueue.map((item) => (
              <div key={`${item.student}-${item.request}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700">
                <div>
                  <p className="font-medium">{item.student}</p>
                  <p className="text-sm text-slate-300">{item.request}</p>
                </div>
                <div className="text-right">
                  <Badge className={item.priority === "high" ? "bg-red-500/20 text-red-300" : item.priority === "medium" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>
                    {item.priority.toUpperCase()}
                  </Badge>
                  <p className="text-xs text-slate-400 mt-1">ETA {item.eta}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle>Governance & Quality</CardTitle>
            <CardDescription className="text-slate-400">Compliance, tutor quality, and escalation health snapshot.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
            <StatusItem label="Escalations Resolved < 24h" value="98%" />
            <StatusItem label="Tutor QA Reviews Completed" value="32 / 32" />
            <StatusItem label="Account Security Alerts" value="0" />
          </CardContent>
        </Card>

        {role === "admin" && (
          <Card className="bg-slate-900 border-emerald-700/40">
            <CardHeader>
              <CardTitle className="text-emerald-300">Admin Privileges Enabled</CardTitle>
              <CardDescription className="text-slate-400">This account has backend-granted admin permissions.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              You can run protected internal bootstrap/operations endpoints when properly authenticated.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardDescription className="text-slate-400">{title}</CardDescription>
        <CardTitle className="text-3xl text-slate-100">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between text-xs text-slate-400">
        <span>{subtitle}</span>
        {icon}
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 p-3 bg-slate-800">
      <p className="text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-100 mt-1">{value}</p>
    </div>
  );
}
