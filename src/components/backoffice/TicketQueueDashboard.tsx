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
  urgent: "bg-red-500/20 text-red-300",
  high: "bg-amber-500/20 text-amber-300",
  medium: "bg-blue-500/20 text-blue-300",
  low: "bg-slate-500/20 text-slate-300",
};

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
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assigned Tickets</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} in your queue
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={loadTickets}
              disabled={refreshing}
              className="border-slate-700 bg-transparent hover:bg-slate-800"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{emptyMessage}</p>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{ticket.title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(ticket.created_at).toLocaleString()} &middot;{" "}
                      {ticket.category.toUpperCase()} &middot; {ticket.source_type}
                    </p>
                    {ticket.requester_email && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Requester:{" "}
                        <a
                          href={`mailto:${ticket.requester_email}`}
                          className="text-slate-300 hover:underline"
                        >
                          {ticket.requester_email}
                        </a>
                      </p>
                    )}
                    {ticket.description && (
                      <p className="text-sm text-slate-300 mt-2 line-clamp-3">{ticket.description}</p>
                    )}
                  </div>
                  <Badge className={PRIORITY_BADGE_CLASSES[ticket.priority] ?? PRIORITY_BADGE_CLASSES.medium}>
                    {ticket.priority.toUpperCase()}
                  </Badge>
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
