"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { RefreshCw, Download } from "lucide-react";
import toast from "react-hot-toast";

interface ReferralAdminRow {
  id: string;
  referrer_id: string;
  referee_email: string | null;
  code: string;
  status: string;
  stripe_session_id: string | null;
  stripe_subscription_id: string | null;
  reward_coupon_id: string | null;
  reward_expires_at: string | null;
  qualified_at: string | null;
  rewarded_at: string | null;
  created_at: string;
}

const STATUS_CLASSES: Record<string, string> = {
  pending:   "bg-yellow-500/20 text-yellow-300",
  qualified: "bg-blue-500/20 text-blue-300",
  rewarded:  "bg-green-500/20 text-green-300",
  reversed:  "bg-red-500/20 text-red-300",
  converted: "bg-teal-500/20 text-teal-300",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function exportCsv(rows: ReferralAdminRow[]) {
  const headers = [
    "id", "referrer_id", "code", "status", "referee_email",
    "qualified_at", "rewarded_at", "reward_coupon_id", "reward_expires_at",
    "stripe_subscription_id", "created_at",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = r[h as keyof ReferralAdminRow] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReferralsPage() {
  const { staffAccess, session, loading: authLoading } = useStaffAccess({
    allowedLevels: ["super_admin"],
  });
  const [rows, setRows] = useState<ReferralAdminRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const token = session?.access_token ?? null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/referrals?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load referrals");
      }
      const body = (await res.json()) as { referrals: ReferralAdminRow[] };
      setRows(body.referrals ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load referrals");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, page]);

  useEffect(() => {
    if (!authLoading && token) {
      fetchData();
    }
  }, [authLoading, token, fetchData]);

  if (authLoading) {
    return (
      <BackofficeShell title="Referrals" subtitle="Admin view" levelLabel="super_admin">
        <div className="flex items-center justify-center h-48 text-slate-400">Loading…</div>
      </BackofficeShell>
    );
  }

  // Stat counts from loaded rows (approximate — server-side count not used here)
  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    qualified: rows.filter((r) => r.status === "qualified").length,
    rewarded: rows.filter((r) => r.status === "rewarded").length,
    reversed: rows.filter((r) => r.status === "reversed").length,
  };

  return (
    <BackofficeShell title="Referrals" subtitle="Admin referral records" levelLabel="super_admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Referrals</h1>
            <p className="text-slate-400 text-sm">All referral records — admin view</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(rows)}
              disabled={rows.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total", count: counts.total, color: "text-white" },
            { label: "Pending", count: counts.pending, color: "text-yellow-300" },
            { label: "In Hold", count: counts.qualified, color: "text-blue-300" },
            { label: "Rewarded", count: counts.rewarded, color: "text-green-300" },
            { label: "Reversed", count: counts.reversed, color: "text-red-300" },
          ].map(({ label, count, color }) => (
            <Card key={label} className="bg-slate-800 border-slate-700">
              <CardContent className="pt-4 pb-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
          >
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="qualified">In Hold</SelectItem>
              <SelectItem value="rewarded">Rewarded</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-slate-400 text-sm">{rows.length} rows shown</span>
        </div>

        {/* Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100 text-base">Referral Records</CardTitle>
            <CardDescription className="text-slate-400">
              Showing page {page}. 14-day hold: &quot;In Hold&quot; → reward issued by nightly cron after window elapses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-10 text-slate-400">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-10 text-slate-500">No referrals found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-700 text-left text-slate-400">
                      <th className="pb-2 pr-3 font-medium">Date</th>
                      <th className="pb-2 pr-3 font-medium">Code</th>
                      <th className="pb-2 pr-3 font-medium">Referee</th>
                      <th className="pb-2 pr-3 font-medium">Status</th>
                      <th className="pb-2 pr-3 font-medium">Qualified</th>
                      <th className="pb-2 pr-3 font-medium">Rewarded</th>
                      <th className="pb-2 font-medium">Coupon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-2 pr-3 whitespace-nowrap text-slate-400">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{row.code}</td>
                        <td className="py-2 pr-3 max-w-40 truncate text-slate-400">
                          {row.referee_email ?? "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge
                            className={`text-xs ${STATUS_CLASSES[row.status] ?? "bg-slate-500/20 text-slate-300"}`}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">
                          {row.qualified_at ? formatDate(row.qualified_at) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">
                          {row.rewarded_at ? formatDate(row.rewarded_at) : "—"}
                        </td>
                        <td className="py-2 font-mono text-xs text-slate-500 max-w-32 truncate">
                          {row.reward_coupon_id ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="border-slate-600 text-slate-300"
              >
                Previous
              </Button>
              <span className="text-slate-400 text-sm">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={rows.length < 50 || loading}
                className="border-slate-600 text-slate-300"
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </BackofficeShell>
  );
}
