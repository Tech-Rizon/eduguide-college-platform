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

const SUPPORT_STATUSES = ["assigned", "in_progress", "waiting_on_student", "resolved", "closed"] as const;

export default function SupportDashboardPage() {
  const { loading, session } = useStaffAccess({
    allowedLevels: ["support"],
  });

  const [tickets, setTickets] = useState<BackofficeTicket[]>([]);
  const [statusByTicket, setStatusByTicket] = useState<Record<string, string>>({});
  const [openThreadTicketId, setOpenThreadTicketId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${session?.access_token}`,
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
        toast.error("Failed to load support queue.");
        return;
      }

      const payload = await response.json();
      const loadedTickets = payload?.tickets ?? [];
      setTickets(loadedTickets);
      setStatusByTicket(
        Object.fromEntries(loadedTickets.map((ticket: BackofficeTicket) => [ticket.id, ticket.status]))
      );
    } catch {
      toast.error("Failed to load support queue.");
    } finally {
      setRefreshing(false);
    }
  }, [authHeaders, session?.access_token]);

  useEffect(() => {
    if (!loading) {
      loadTickets();
    }
  }, [loadTickets, loading]);

  useBackofficeRealtime({
    enabled: Boolean(session?.access_token),
    channelKey: "support-dashboard",
    onChange: loadTickets,
  });

  const updateStatus = async (ticketId: string) => {
    const nextStatus = statusByTicket[ticketId];
    if (!nextStatus) return;

    try {
      const response = await fetch("/api/backoffice/tickets/status", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ticketId,
          status: nextStatus,
        }),
      });

      const payload = await response.json().catch(() => null);
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
        Loading support workspace...
      </div>
    );
  }

  return (
    <BackofficeShell
      title="Support Dashboard"
      subtitle="Handle support and operations tickets assigned by auto-routing or managers."
      levelLabel="SUPPORT"
    >
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle>Assigned Support Tickets</CardTitle>
          <CardDescription className="text-slate-400">
            Ticket status updates sync with support request records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-end">
            <Button variant="outline" onClick={loadTickets} disabled={refreshing} className="border-slate-700 bg-transparent hover:bg-slate-800">
              Refresh
            </Button>
          </div>

          {tickets.map((ticket) => (
            <div key={ticket.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{ticket.title}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(ticket.created_at).toLocaleString()} | {ticket.category.toUpperCase()} | {ticket.source_type}
                  </p>
                  {ticket.requester_email && <p className="text-xs text-slate-400 mt-1">Requester: {ticket.requester_email}</p>}
                  {ticket.description && <p className="text-sm text-slate-300 mt-2">{ticket.description}</p>}
                </div>
                <Badge className={ticket.priority === "urgent" ? "bg-red-500/20 text-red-300" : ticket.priority === "high" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>
                  {ticket.priority.toUpperCase()}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <Select
                  value={statusByTicket[ticket.id] ?? ticket.status}
                  onValueChange={(value) => setStatusByTicket((prev) => ({ ...prev, [ticket.id]: value }))}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 sm:col-span-2">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => updateStatus(ticket.id)} className="bg-emerald-600 hover:bg-emerald-500">
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
          ))}

          {tickets.length === 0 && (
            <p className="text-sm text-slate-400">No support tickets are currently assigned to you.</p>
          )}
        </CardContent>
      </Card>
    </BackofficeShell>
  );
}
