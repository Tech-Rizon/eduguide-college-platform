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
  staffLevel: "tutor" | "support" | "manager" | "super_admin";
};

type BackofficeTicket = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  source_type: string;
  assigned_team: "tutor" | "support" | null;
  assigned_to_user_id: string | null;
  requester_email: string | null;
  created_at: string;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  breach_at: string | null;
  escalated_at: string | null;
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

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SlaChip({ ticket }: { ticket: BackofficeTicket }) {
  if (ticket.status === "resolved" || ticket.status === "closed") return null;
  const due = ticket.resolution_due_at ?? ticket.breach_at;
  if (!due) return null;

  const dueMs = new Date(due).getTime();
  const now = Date.now();
  const diffMs = dueMs - now;

  let label: string;
  let cls: string;

  if (diffMs < 0) {
    const overMins = Math.floor(Math.abs(diffMs) / 60_000);
    const overHours = Math.floor(overMins / 60);
    label = overHours > 0 ? `SLA +${overHours}h` : `SLA +${overMins}m`;
    cls = "bg-red-500/20 text-red-400 border border-red-500/30";
  } else if (diffMs < 3_600_000) {
    const remMins = Math.ceil(diffMs / 60_000);
    label = `SLA ${remMins}m`;
    cls = "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  } else {
    const remHours = Math.floor(diffMs / 3_600_000);
    const remDays = Math.floor(remHours / 24);
    label = remDays > 0 ? `SLA ${remDays}d` : `SLA ${remHours}h`;
    cls = "bg-slate-700/40 text-slate-400 border border-slate-600/30";
  }

  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

export default function ManagerDashboardPage() {
  const { loading, session } = useStaffAccess({
    allowedLevels: ["manager", "super_admin"],
  });

  const [tickets, setTickets] = useState<BackofficeTicket[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [openThreadTicketId, setOpenThreadTicketId] = useState<string | null>(null);
  const [assignmentMap, setAssignmentMap] = useState<Record<string, { assignedTeam: "tutor" | "support"; assigneeUserId: string }>>({});

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token}`,
      "Content-Type": "application/json",
    }),
    [session?.access_token]
  );

  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    setRefreshing(true);
    try {
      const [ticketRes, staffRes] = await Promise.all([
        fetch("/api/backoffice/tickets", { headers: authHeaders }),
        fetch("/api/backoffice/staff", { headers: authHeaders }),
      ]);

      if (!ticketRes.ok || !staffRes.ok) {
        toast.error("Failed to load manager queue.");
        return;
      }

      const ticketPayload = await ticketRes.json() as { tickets?: BackofficeTicket[] };
      const staffPayload = await staffRes.json() as { staff?: StaffUser[] };
      setTickets(ticketPayload?.tickets ?? []);
      setStaff(staffPayload?.staff ?? []);
    } catch {
      toast.error("Unable to load manager queue.");
    } finally {
      setRefreshing(false);
    }
  }, [authHeaders, session?.access_token]);

  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [loadData, loading]);

  useBackofficeRealtime({
    enabled: Boolean(session?.access_token),
    channelKey: "manager-dashboard",
    onChange: loadData,
  });

  const filteredTickets = useMemo(() => {
    let result = tickets;

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((ticket) =>
        [ticket.title, ticket.description ?? "", ticket.requester_email ?? "", ticket.category]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }

    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") result = result.filter((t) => t.priority === priorityFilter);
    if (teamFilter !== "all") result = result.filter((t) => t.assigned_team === teamFilter);

    return result;
  }, [search, tickets, statusFilter, priorityFilter, teamFilter]);

  const unassignedCount = useMemo(() => tickets.filter((t) => !t.assigned_to_user_id).length, [tickets]);
  const inProgressCount = useMemo(() => tickets.filter((t) => t.status === "in_progress").length, [tickets]);
  const breachedCount = useMemo(() => {
    const now = Date.now();
    return tickets.filter((t) => {
      if (t.status === "resolved" || t.status === "closed") return false;
      const due = t.resolution_due_at ?? t.breach_at;
      return due ? new Date(due).getTime() < now : false;
    }).length;
  }, [tickets]);

  const tutors = useMemo(() => staff.filter((u) => u.staffLevel === "tutor"), [staff]);
  const supportAgents = useMemo(() => staff.filter((u) => u.staffLevel === "support"), [staff]);

  const changeAssignedTeam = (ticketId: string, team: "tutor" | "support") => {
    const pool = team === "tutor" ? tutors : supportAgents;
    setAssignmentMap((prev) => ({
      ...prev,
      [ticketId]: {
        assignedTeam: team,
        assigneeUserId: prev[ticketId]?.assigneeUserId && pool.some((c) => c.userId === prev[ticketId].assigneeUserId)
          ? prev[ticketId].assigneeUserId
          : "",
      },
    }));
  };

  const changeAssignee = (ticketId: string, assigneeUserId: string) => {
    setAssignmentMap((prev) => ({
      ...prev,
      [ticketId]: {
        assignedTeam: prev[ticketId]?.assignedTeam ?? "support",
        assigneeUserId,
      },
    }));
  };

  const assignTicket = async (ticketId: string) => {
    const assignment = assignmentMap[ticketId];
    if (!assignment?.assignedTeam || !assignment?.assigneeUserId) {
      toast.error("Pick a team and assignee first.");
      return;
    }

    try {
      const res = await fetch("/api/backoffice/tickets/assign", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ticketId,
          assignedTeam: assignment.assignedTeam,
          assigneeUserId: assignment.assigneeUserId,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        toast.error(payload?.error ?? "Assignment failed.");
        return;
      }

      toast.success("Ticket assigned.");
      await loadData();
    } catch {
      toast.error("Assignment failed.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Loading manager workspace...
      </div>
    );
  }

  return (
    <BackofficeShell
      title="Manager Operations Dashboard"
      subtitle="Review all incoming tickets, track auto-assignments, and override routing when needed."
      levelLabel="MANAGER"
    >
      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Total Queue</CardDescription>
            <CardTitle className="text-3xl text-slate-100">{tickets.length}</CardTitle>
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
            <CardDescription className="text-slate-400">In Progress</CardDescription>
            <CardTitle className="text-3xl text-emerald-300">{inProgressCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">SLA Breached</CardDescription>
            <CardTitle className="text-3xl text-red-300">{breachedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription className="text-slate-400">
            Auto-assignment is active. Use manual assignment only for exceptions or escalations.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder="Search title, category, requester..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100 lg:col-span-2"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
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
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200 flex-1">
                <SelectValue placeholder="Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="tutor">Tutor</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData} disabled={refreshing} className="border-slate-700 bg-transparent hover:bg-slate-800">
              {refreshing ? "..." : "↺"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket list */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription className="text-slate-400">
            {filteredTickets.length} of {tickets.length} tickets &mdash; manager queue with assignment controls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredTickets.map((ticket) => {
            const assignment = assignmentMap[ticket.id] ?? {
              assignedTeam: (ticket.assigned_team ?? "support") as "tutor" | "support",
              assigneeUserId: ticket.assigned_to_user_id ?? "",
            };
            const candidatePool = assignment.assignedTeam === "tutor" ? tutors : supportAgents;
            const autoAssigned = Boolean(ticket.assigned_to_user_id);

            return (
              <div key={ticket.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{ticket.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                      <span className="text-xs text-slate-400">{formatRelativeTime(ticket.created_at)}</span>
                      <span className="text-slate-600 text-xs">&middot;</span>
                      <span className="text-xs text-slate-400">{ticket.category.toUpperCase()}</span>
                      <span className="text-slate-600 text-xs">&middot;</span>
                      <span className="text-xs text-slate-400">{ticket.source_type}</span>
                      <SlaChip ticket={ticket} />
                    </div>
                    {ticket.requester_email && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        <a href={`mailto:${ticket.requester_email}`} className="hover:underline text-slate-300">
                          {ticket.requester_email}
                        </a>
                      </p>
                    )}
                    {ticket.description && (
                      <p className="text-sm text-slate-300 mt-2 line-clamp-2">{ticket.description}</p>
                    )}
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

                <div className="grid sm:grid-cols-3 gap-3">
                  <Select
                    value={assignment.assignedTeam}
                    onValueChange={(value) => changeAssignedTeam(ticket.id, value as "tutor" | "support")}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700">
                      <SelectValue placeholder="Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="tutor">Tutor</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={assignment.assigneeUserId || "none"}
                    onValueChange={(value) => {
                      if (value === "none") return;
                      changeAssignee(ticket.id, value);
                    }}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choose assignee</SelectItem>
                      {candidatePool.map((candidate) => (
                        <SelectItem key={candidate.userId} value={candidate.userId}>
                          {candidate.email ?? candidate.userId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button onClick={() => assignTicket(ticket.id)} className="bg-emerald-600 hover:bg-emerald-500">
                    {autoAssigned ? "Reassign" : "Assign"}
                  </Button>
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
            );
          })}
          {filteredTickets.length === 0 && !refreshing && (
            <p className="text-sm text-slate-400 py-4 text-center">No tickets match the current filters.</p>
          )}
        </CardContent>
      </Card>
    </BackofficeShell>
  );
}
