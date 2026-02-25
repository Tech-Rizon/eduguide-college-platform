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
};

export default function ManagerDashboardPage() {
  const { loading, session } = useStaffAccess({
    allowedLevels: ["manager", "super_admin"],
  });

  const [tickets, setTickets] = useState<BackofficeTicket[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
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
    const term = search.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter((ticket) =>
      [ticket.title, ticket.description ?? "", ticket.requester_email ?? "", ticket.category]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [search, tickets]);

  const unassignedCount = useMemo(() => tickets.filter((ticket) => !ticket.assigned_to_user_id).length, [tickets]);
  const inProgressCount = useMemo(() => tickets.filter((ticket) => ticket.status === "in_progress").length, [tickets]);

  const tutors = useMemo(() => staff.filter((user) => user.staffLevel === "tutor"), [staff]);
  const supportAgents = useMemo(() => staff.filter((user) => user.staffLevel === "support"), [staff]);

  const changeAssignedTeam = (ticketId: string, team: "tutor" | "support") => {
    const pool = team === "tutor" ? tutors : supportAgents;
    setAssignmentMap((prev) => ({
      ...prev,
      [ticketId]: {
        assignedTeam: team,
        assigneeUserId: prev[ticketId]?.assigneeUserId && pool.some((candidate) => candidate.userId === prev[ticketId].assigneeUserId)
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
      <div className="grid sm:grid-cols-3 gap-4">
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
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Queue Filters</CardTitle>
          <CardDescription className="text-slate-400">
            Auto-assignment is active. Use manual assignment only for exceptions or escalations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="Search title, category, requester..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100"
          />
          <Button variant="outline" onClick={loadData} disabled={refreshing} className="border-slate-700 bg-transparent hover:bg-slate-800">
            Refresh
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription className="text-slate-400">Manager-level queue with assignment controls.</CardDescription>
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
                  <div>
                    <p className="font-semibold">{ticket.title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(ticket.created_at).toLocaleString()} | {ticket.category.toUpperCase()} | {ticket.source_type}
                    </p>
                    {ticket.description && <p className="text-sm text-slate-300 mt-2">{ticket.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-slate-700 text-slate-200">{ticket.status}</Badge>
                    <Badge className={ticket.priority === "urgent" ? "bg-red-500/20 text-red-300" : ticket.priority === "high" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>
                      {ticket.priority.toUpperCase()}
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

                  <Button
                    onClick={() => assignTicket(ticket.id)}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    {autoAssigned ? "Reassign" : "Assign"}
                  </Button>
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
            );
          })}
        </CardContent>
      </Card>
    </BackofficeShell>
  );
}
