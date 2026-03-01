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
  assigned_team: string | null;
  requester_email: string | null;
  created_at: string;
  resolution_due_at: string | null;
  breach_at: string | null;
};

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-300",
  high: "bg-amber-500/20 text-amber-300",
  medium: "bg-blue-500/20 text-blue-300",
  low: "bg-slate-500/20 text-slate-300",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  new: "bg-slate-500/20 text-slate-300",
  assigned: "bg-violet-500/20 text-violet-300",
  in_progress: "bg-emerald-500/20 text-emerald-300",
  waiting_on_student: "bg-amber-500/20 text-amber-300",
  resolved: "bg-teal-500/20 text-teal-300",
  closed: "bg-slate-600/20 text-slate-400",
};

const STAFF_LEVEL_CLASSES: Record<string, string> = {
  super_admin: "bg-red-500/20 text-red-300",
  manager: "bg-amber-500/20 text-amber-300",
  support: "bg-blue-500/20 text-blue-300",
  tutor: "bg-violet-500/20 text-violet-300",
};

type StudentLead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  status: "lead" | "registered" | "subscribed";
};

const STUDENT_STATUS_BADGE: Record<string, string> = {
  lead: "bg-slate-500/20 text-slate-300",
  registered: "bg-blue-500/20 text-blue-300",
  subscribed: "bg-emerald-500/20 text-emerald-300",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SlaChip({ ticket }: { ticket: TicketSummary }) {
  if (ticket.status === "resolved" || ticket.status === "closed") return null;
  const due = ticket.resolution_due_at ?? ticket.breach_at;
  if (!due) return null;

  const diffMs = new Date(due).getTime() - Date.now();
  let label: string;
  let cls: string;

  if (diffMs < 0) {
    const overHours = Math.floor(Math.abs(diffMs) / 3_600_000);
    label = overHours > 0 ? `SLA +${overHours}h` : `SLA +${Math.floor(Math.abs(diffMs) / 60_000)}m`;
    cls = "bg-red-500/20 text-red-400 border border-red-500/30";
  } else if (diffMs < 3_600_000) {
    label = `SLA ${Math.ceil(diffMs / 60_000)}m`;
    cls = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  } else {
    const remDays = Math.floor(diffMs / 86_400_000);
    label = remDays > 0 ? `SLA ${remDays}d` : `SLA ${Math.floor(diffMs / 3_600_000)}h`;
    cls = "bg-slate-700/40 text-slate-400 border border-slate-600/30";
  }

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeView, setActiveView] = useState<"overview" | "students">("overview");
  const [students, setStudents] = useState<StudentLead[]>([]);
  const [studentStatusFilter, setStudentStatusFilter] = useState("all");

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
      const [staffRes, ticketRes, studentRes] = await Promise.all([
        fetch("/api/backoffice/staff", { headers: authHeaders }),
        fetch("/api/backoffice/tickets", { headers: authHeaders }),
        fetch("/api/admin/students", { headers: authHeaders }),
      ]);

      if (!staffRes.ok || !ticketRes.ok) {
        toast.error("Failed to load super admin data.");
        return;
      }

      const staffPayload = await staffRes.json() as { staff?: StaffUser[] };
      const ticketPayload = await ticketRes.json() as { tickets?: TicketSummary[] };
      setStaff(staffPayload?.staff ?? []);
      setTickets(ticketPayload?.tickets ?? []);
      if (studentRes.ok) {
        const studentPayload = await studentRes.json() as { students?: StudentLead[] };
        setStudents(studentPayload?.students ?? []);
      }
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

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const unassignedCount = useMemo(() => tickets.filter((t) => !t.assigned_to_user_id).length, [tickets]);
  const urgentCount = useMemo(() => tickets.filter((t) => t.priority === "urgent").length, [tickets]);
  const superAdminCount = useMemo(() => staff.filter((m) => m.staffLevel === "super_admin").length, [staff]);
  const breachedCount = useMemo(() => {
    const now = Date.now();
    return tickets.filter((t) => {
      if (t.status === "resolved" || t.status === "closed") return false;
      const due = t.resolution_due_at ?? t.breach_at;
      return due ? new Date(due).getTime() < now : false;
    }).length;
  }, [tickets]);

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
      {/* View switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "overview" ? "default" : "outline"}
          onClick={() => setActiveView("overview")}
          className={activeView !== "overview" ? "border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300" : ""}
        >
          Overview
        </Button>
        <Button
          variant={activeView === "students" ? "default" : "outline"}
          onClick={() => setActiveView("students")}
          className={activeView !== "students" ? "border-slate-700 bg-transparent hover:bg-slate-800 text-slate-300" : ""}
        >
          Students
          <Badge className="ml-2 bg-slate-600 text-slate-200">{students.length}</Badge>
        </Button>
      </div>

      {activeView === "students" && (
        <>
          {/* Student filter */}
          <div className="flex items-center gap-3">
            <Select value={studentStatusFilter} onValueChange={setStudentStatusFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                <SelectItem value="lead">Leads (no account)</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="subscribed">Subscribed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-400">
              {students.filter((s) => studentStatusFilter === "all" || s.status === studentStatusFilter).length} student(s)
            </span>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription className="text-slate-400">
                All students who have started registration. Leads haven&apos;t created an account yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students
                  .filter((s) => studentStatusFilter === "all" || s.status === studentStatusFilter)
                  .map((s) => (
                    <div key={s.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-100">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-sm text-slate-400 mt-0.5">{s.email}</p>
                          {s.phone && (
                            <p className="text-sm text-slate-300 mt-0.5 font-mono">{s.phone}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-1">{formatRelativeTime(s.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={STUDENT_STATUS_BADGE[s.status] ?? STUDENT_STATUS_BADGE.lead}>
                            {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                          </Badge>
                          {s.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 bg-transparent hover:bg-slate-700 text-slate-300 text-xs"
                              onClick={() => {
                                navigator.clipboard.writeText(s.phone ?? "");
                                toast.success("Phone copied");
                              }}
                            >
                              Copy Phone
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {students.filter((s) => studentStatusFilter === "all" || s.status === studentStatusFilter).length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">
                    {studentStatusFilter === "all" ? "No students yet." : `No ${studentStatusFilter} students.`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeView === "overview" && (
      <>
      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Staff Accounts</CardDescription>
            <CardTitle className="text-3xl text-slate-100">{staff.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Unassigned</CardDescription>
            <CardTitle className="text-3xl text-amber-300">{unassignedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Urgent</CardDescription>
            <CardTitle className="text-3xl text-red-300">{urgentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">SLA Breached</CardDescription>
            <CardTitle className="text-3xl text-red-300">{breachedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Role Assignment */}
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
            onChange={(e) => setTargetEmail(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100 sm:col-span-2"
          />
          <Select value={targetLevel} onValueChange={(v) => setTargetLevel(v as "tutor" | "support" | "manager" | "super_admin")}>
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

      {/* Staff Directory */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription className="text-slate-400">
            {staff.length} total &mdash; {superAdminCount} super admin{superAdminCount !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {staff.map((member) => (
            <div key={member.userId} className="rounded-lg border border-slate-700 bg-slate-800 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{member.email ?? member.userId}</p>
                <p className="text-xs text-slate-400 font-mono">{member.userId}</p>
              </div>
              <Badge className={STAFF_LEVEL_CLASSES[member.staffLevel] ?? "bg-slate-500/20 text-slate-300"}>
                {member.staffLevel.replace(/_/g, " ").toUpperCase()}
              </Badge>
            </div>
          ))}
          {staff.length === 0 && (
            <p className="text-sm text-slate-400">No staff roles assigned yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Ticket Intake */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Ticket Intake</CardTitle>
              <CardDescription className="text-slate-400">
                {filteredTickets.length} of {tickets.length} tickets &mdash; includes auto-assigned tutoring and support requests.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting_on_student">Waiting on Student</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={loadData}
                disabled={loadingData}
                className="border-slate-700 bg-transparent hover:bg-slate-800"
              >
                {loadingData ? "..." : "↺"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredTickets.slice(0, 20).map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ticket.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                    <span className="text-xs text-slate-400">{formatRelativeTime(ticket.created_at)}</span>
                    {ticket.requester_email && (
                      <>
                        <span className="text-slate-600 text-xs">&middot;</span>
                        <a href={`mailto:${ticket.requester_email}`} className="text-xs text-slate-400 hover:underline">
                          {ticket.requester_email}
                        </a>
                      </>
                    )}
                    <SlaChip ticket={ticket} />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge className={PRIORITY_BADGE_CLASSES[ticket.priority] ?? PRIORITY_BADGE_CLASSES.medium}>
                    {ticket.priority.toUpperCase()}
                  </Badge>
                  <Badge className={STATUS_BADGE_CLASSES[ticket.status] ?? "bg-slate-500/20 text-slate-300"}>
                    {ticket.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-transparent hover:bg-slate-700"
                  onClick={() => setOpenThreadTicketId((prev) => (prev === ticket.id ? null : ticket.id))}
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
          {!loadingData && filteredTickets.length === 0 && (
            <p className="text-sm text-slate-400">No tickets match the current filter.</p>
          )}
        </CardContent>
      </Card>

      {/* Referral Program Admin */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Referral Program</CardTitle>
        </CardHeader>
        <CardContent>
          <a href="/backoffice/super-admin/referrals">
            <button
              type="button"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            >
              View Referral Records →
            </button>
          </a>
        </CardContent>
      </Card>
      </>
      )}
    </BackofficeShell>
  );
}
