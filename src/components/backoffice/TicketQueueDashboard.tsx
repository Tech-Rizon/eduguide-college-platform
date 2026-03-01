"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackofficeShell } from "@/components/backoffice/BackofficeShell";
import { TicketThreadPanel } from "@/components/backoffice/TicketThreadPanel";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useBackofficeRealtime } from "@/hooks/useBackofficeRealtime";

type StaffLevel = "tutor" | "support" | "manager" | "super_admin";

type BackofficeTicket = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  source_type: string;
  requester_email: string | null;
  created_at: string;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  breach_at: string | null;
  escalated_at: string | null;
};

interface TicketQueueDashboardProps {
  staffLevel: Extract<StaffLevel, "tutor" | "support">;
  title: string;
  subtitle: string;
  levelLabel: string;
  availableStatuses: readonly string[];
  emptyMessage: string;
}

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  low: "bg-slate-500/20 text-slate-300 border-slate-500/30",
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
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SlaState = "ok" | "warning" | "breached" | "none";

function getSlaState(ticket: BackofficeTicket): SlaState {
  if (ticket.status === "resolved" || ticket.status === "closed") return "none";
  const due = ticket.resolution_due_at ?? ticket.breach_at;
  if (!due) return "none";
  const dueMs = new Date(due).getTime();
  const now = Date.now();
  if (now > dueMs) return "breached";
  if (now > dueMs - 60 * 60_000) return "warning"; // within 1h
  return "ok";
}

function SlaChip({ ticket }: { ticket: BackofficeTicket }) {
  const state = getSlaState(ticket);
  if (state === "none") return null;

  const due = ticket.resolution_due_at ?? ticket.breach_at ?? "";
  const dueDate = new Date(due);
  const now = Date.now();
  const diffMs = dueDate.getTime() - now;

  let label: string;
  let cls: string;

  if (state === "breached") {
    const overMins = Math.floor(Math.abs(diffMs) / 60_000);
    const overHours = Math.floor(overMins / 60);
    label = overHours > 0 ? `SLA +${overHours}h` : `SLA +${overMins}m`;
    cls = "bg-red-500/20 text-red-400 border border-red-500/30";
  } else if (state === "warning") {
    const remMins = Math.ceil(diffMs / 60_000);
    label = remMins < 60 ? `SLA ${remMins}m` : `SLA ${Math.ceil(remMins / 60)}h`;
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

export function TicketQueueDashboard({
  staffLevel,
  title,
  subtitle,
  levelLabel,
  availableStatuses,
  emptyMessage,
}: TicketQueueDashboardProps) {
  const { loading, session } = useStaffAccess({ allowedLevels: [staffLevel] });

  const [tickets, setTickets] = useState<BackofficeTicket[]>([]);
  const [statusByTicket, setStatusByTicket] = useState<Record<string, string>>({});
  const [openThreadTicketId, setOpenThreadTicketId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    }),
    [session?.access_token]
  );

  const loadTickets = useCallback(async () => {
    if (!session?.access_token) return;

    setRefreshing(true);
    try {
      const response = await fetch("/api/backoffice/tickets?mine=true", { headers: authHeaders });
      if (!response.ok) {
        toast.error("Failed to load ticket queue.");
        return;
      }

      const payload = await response.json() as { tickets?: BackofficeTicket[] };
      const loaded: BackofficeTicket[] = payload?.tickets ?? [];
      setTickets(loaded);
      setStatusByTicket(
        Object.fromEntries(loaded.map((t) => [t.id, t.status]))
      );
    } catch {
      toast.error("Failed to load ticket queue.");
    } finally {
      setRefreshing(false);
    }
  }, [authHeaders, session?.access_token]);

  useEffect(() => {
    if (!loading) loadTickets();
  }, [loadTickets, loading]);

  useBackofficeRealtime({
    enabled: Boolean(session?.access_token),
    channelKey: `${staffLevel}-dashboard`,
    onChange: loadTickets,
  });

  const filteredTickets = useMemo(() => {
    if (statusFilter === "all") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  const urgentCount = useMemo(() => tickets.filter((t) => t.priority === "urgent").length, [tickets]);
  const breachedCount = useMemo(() => tickets.filter((t) => getSlaState(t) === "breached").length, [tickets]);

  const updateStatus = async (ticketId: string) => {
    const nextStatus = statusByTicket[ticketId];
    if (!nextStatus) return;

    try {
      const response = await fetch("/api/backoffice/tickets/status", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ ticketId, status: nextStatus }),
      });

      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        toast.error(payload?.error ?? "Status update failed.");
        return;
      }

      toast.success("Ticket status updated.");
      await loadTickets();
    } catch {
      toast.error("Status update failed.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">
        Loading workspace...
      </div>
    );
  }

  return (
    <BackofficeShell title={title} subtitle={subtitle} levelLabel={levelLabel}>
      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Your Queue</CardDescription>
            <CardTitle className="text-3xl text-slate-100">{tickets.length}</CardTitle>
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
            <CardTitle className="text-3xl text-amber-300">{breachedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Assigned Tickets</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                {filteredTickets.length} of {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} shown
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {availableStatuses.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={loadTickets}
                disabled={refreshing}
                className="border-slate-700 bg-transparent hover:bg-slate-800"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredTickets.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              {statusFilter === "all" ? emptyMessage : `No ${statusFilter.replace(/_/g, " ")} tickets.`}
            </p>
          ) : (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{ticket.title}</p>
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
                        <a href={`mailto:${ticket.requester_email}`} className="text-slate-300 hover:underline">
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
                    value={statusByTicket[ticket.id] ?? ticket.status}
                    onValueChange={(value) =>
                      setStatusByTicket((prev) => ({ ...prev, [ticket.id]: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-700 sm:col-span-2">
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => updateStatus(ticket.id)}
                    disabled={statusByTicket[ticket.id] === ticket.status}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Update
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
            ))
          )}
        </CardContent>
      </Card>
    </BackofficeShell>
  );
}
