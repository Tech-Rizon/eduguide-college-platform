import { NextResponse } from "next/server";
import { canManageTickets, resolveAccessFromRequest } from "@/lib/accessControl";
import { createUserScopedSupabaseClient } from "@/lib/supabaseRequest";
import { runBackofficeTicketTriage } from "@/lib/aiTriageServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!access.isStaffView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (access.mfaRequired) {
      return NextResponse.json({ error: "MFA required for this account level" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const ticketId = typeof body?.ticketId === "string" ? body.ticketId : "";
    if (!ticketId) {
      return NextResponse.json({ error: "ticketId is required" }, { status: 400 });
    }

    const supabaseUser = createUserScopedSupabaseClient(request);
    const { data: ticket, error: ticketError } = await supabaseUser
      .from("backoffice_tickets")
      .select("id, assigned_to_user_id")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (!canManageTickets(access.staffLevel) && ticket.assigned_to_user_id !== access.user.id) {
      return NextResponse.json({ error: "Forbidden: not assigned to this ticket" }, { status: 403 });
    }

    const result = await runBackofficeTicketTriage(ticketId, {
      requestedByUserId: access.user.id,
    });

    return NextResponse.json({ triageRun: result.run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run AI triage";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
