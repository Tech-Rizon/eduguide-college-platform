"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";
import { TicketThreadPanel } from "@/components/backoffice/TicketThreadPanel";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useBackofficeRealtime } from "@/hooks/useBackofficeRealtime";

type StaffUser = {
  userId: string;
  email: string | null;
  role: "student" | "staff";
  staffLevel: "tutor" | "support" | "manager" | "super_admin";
};

type TicketSummary = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  created_at: string;
};

export default function SuperAdminDashboardPage() {
  const { loading, session } = useStaffAccess({
    allowedLevels: ["super_admin"],
  });

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [openThreadTicketId, setOpenThreadTicketId] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState("");
  const [targetLevel, setTargetLevel] = useState<"tutor" | "support" | "manager" | "super_admin">("support");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    }),
    [session?.access_token]
  );

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoadingData(true);
    try {
      const [staffRes, ticketRes] = await Promise.all([
        fetch("/api/backoffice/staff", { headers: authHeaders }),
        fetch("/api/backoffice/tickets", { headers: authHeaders }),
      ]);

      if (!staffRes.ok || !ticketRes.ok) {
        toast.error("Failed to load super admin data.");
        return;
      }

      const staffPayload = await staffRes.json() as { staff?: StaffUser[] };
      const ticketPayload = await ticketRes.json() as { tickets?: TicketSummary[] };
      setStaff(staffPayload?.staff ?? []);
      setTickets(ticketPayload?.tickets ?? []);
    } catch {
      toast.error("Failed to load super admin data.");
    } finally {
      setLoadingData(false);
    }
  }, [authHeaders, session?.access_token]);

  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [loadData, loading]);

  useBackofficeRealtime({
    enabled: Boolean(session?.access_token),
    channelKey: "super-admin-dashboard",
    onChange: loadData,
  });

  const assignStaffRole = async () => {
    if (!targetEmail.trim()) {
      toast.error("Enter a staff email.");
      return;
    }

    try {
      const res = await fetch("/api/backoffice/roles", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          email: targetEmail.trim(),
          role: "staff",
          staffLevel: targetLevel,
        }),
      });

      const payload = await res.json().catch(() => ({})) as { error?: string };
      if (!res.ok) {
        toast.error(payload?.error ?? "Role assignment failed.");
        return;
      }

      toast.success(`Assigned ${targetLevel} role.`);
      setTargetEmail("");
      await loadData();
    } catch {
      toast.error("Role assignment failed.");
    }
  };

  const unassignedCount = useMemo(() => tickets.filter((ticket) => !ticket.assigned_to_user_id).length, [tickets]);
  const urgentCount = useMemo(() => tickets.filter((ticket) => ticket.priority === "urgent").length, [tickets]);
  const superAdminCount = useMemo(() => staff.filter((member) => member.staffLevel === "super_admin").length, [staff]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Loading super admin workspace...
      </div>
    );
  }

  return (
    <BackofficeShell
      title="Super Admin Control Center"
      subtitle="Control role governance, private dashboard access, and enterprise backoffice operations."
      levelLabel="SUPER ADMIN"
    >
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Staff Accounts</CardDescription>
            <CardTitle className="text-3xl text-slate-100">{staff.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Unassigned Tickets</CardDescription>
            <CardTitle className="text-3xl text-amber-300">{unassignedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Urgent Tickets</CardDescription>
            <CardTitle className="text-3xl text-red-300">{urgentCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Role Assignment</CardTitle>
          <CardDescription className="text-slate-400">
            Assign staff levels. Private dashboards are routed by backend role checks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3">
          <Input
            placeholder="staff@company.com"
            value={targetEmail}
            onChange={(event) => setTargetEmail(event.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100 sm:col-span-2"
          />
          <Select value={targetLevel} onValueChange={(value) => setTargetLevel(value as "tutor" | "support" | "manager" | "super_admin")}>
            <SelectTrigger className="bg-slate-800 border-slate-700">
              <SelectValue placeholder="Role level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="tutor">Tutor</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={assignStaffRole} className="bg-emerald-600 hover:bg-emerald-500">
            Assign
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription className="text-slate-400">
            Super admin accounts configured: {superAdminCount}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.map((member) => (
            <div key={member.userId} className="rounded-lg border border-slate-700 bg-slate-800 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{member.email ?? member.userId}</p>
                <p className="text-xs text-slate-400">{member.userId}</p>
              </div>
              <Badge className={member.staffLevel === "super_admin" ? "bg-red-500/20 text-red-300" : member.staffLevel === "manager" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>
                {member.staffLevel.toUpperCase()}
              </Badge>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="text-sm text-slate-400">No staff roles assigned yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Recent Ticket Intake</CardTitle>
          <CardDescription className="text-slate-400">
            Includes auto-assigned tutoring and support requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {tickets.slice(0, 12).map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{ticket.title}</p>
                  <p className="text-xs text-slate-400">{new Date(ticket.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-slate-700 text-slate-200">{ticket.status}</Badge>
                  <Badge className={ticket.priority === "urgent" ? "bg-red-500/20 text-red-300" : ticket.priority === "high" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>
                    {ticket.priority.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-transparent hover:bg-slate-700"
                  onClick={() =>
                    setOpenThreadTicketId((prev) => (prev === ticket.id ? null : ticket.id))
                  }
                >
                  {openThreadTicketId === ticket.id ? "Hide Thread" : "Open Thread"}
                </Button>
              </div>

              {openThreadTicketId === ticket.id && (
                <TicketThreadPanel
                  ticketId={ticket.id}
                  accessToken={session?.access_token}
                  canAddInternalNotes={true}
                />
              )}
            </div>
          ))}
          {!loadingData && tickets.length === 0 && (
            <p className="text-sm text-slate-400">No tickets in queue yet.</p>
          )}
        </CardContent>
      </Card>
    </BackofficeShell>
  );
}
