"use client";

import Link from "next/link";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaffAccess } from "@/hooks/useStaffAccess";

function formatStaffLevelLabel(value: string | null | undefined): string {
  if (!value) return "STAFF";
  return value.replace(/_/g, " ").toUpperCase();
}

export default function BackofficeHomePage() {
  const { loading, staffAccess } = useStaffAccess();

  if (loading || !staffAccess?.staffLevel) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        Loading backoffice...
      </div>
    );
  }

  const links = [
    {
      href: staffAccess.dashboardPath,
      title: "My Dashboard",
      description: "Open the primary queue and controls for your current staff role.",
    },
  ];

  if (staffAccess.staffLevel === "manager") {
    links.push({
      href: "/backoffice/manager",
      title: "Manager Queue",
      description: "Review all backoffice tickets, override assignment, and track SLA risk.",
    });
  }

  if (staffAccess.staffLevel === "super_admin") {
    links.push(
      {
        href: "/backoffice/manager",
        title: "Manager Queue",
        description: "See the full manager view, including cross-team ticket assignment.",
      },
      {
        href: "/backoffice/super-admin/referrals",
        title: "Referral Records",
        description: "Review referral lifecycle records and export them for audit work.",
      },
      {
        href: "/backoffice/super-admin/colleges",
        title: "College Catalog",
        description: "Seed and refresh the database-backed college catalog from backoffice.",
      }
    );
  }

  return (
    <BackofficeShell
      title="Backoffice Home"
      subtitle="One place to see the pages your current staff role can access."
      levelLabel={formatStaffLevelLabel(staffAccess.staffLevel)}
      staffLevel={staffAccess.staffLevel}
    >
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle>Your Access</CardTitle>
          <CardDescription className="text-slate-400">
            New tutoring and support tickets are auto-assigned only when matching tutor/support staff roles exist and the latest DB trigger migration is applied.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-300">
            Current role: <span className="font-medium text-slate-100">{formatStaffLevelLabel(staffAccess.staffLevel)}</span>
          </p>
          <p className="text-sm text-slate-400">
            Use the cards below or the top navigation to move between backoffice pages. Every page now keeps a visible path back here.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Card key={link.href} className="border-slate-800 bg-slate-900">
            <CardHeader>
              <CardTitle className="text-slate-100">{link.title}</CardTitle>
              <CardDescription className="text-slate-400">{link.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={link.href}>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-500">Open Page</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </BackofficeShell>
  );
}
