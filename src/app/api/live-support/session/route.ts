import { NextResponse } from "next/server";
import { resolveAccessFromRequest } from "@/lib/accessControl";
import { createUserScopedSupabaseClient } from "@/lib/supabaseRequest";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const OPEN_TICKET_STATUSES = ["new", "assigned", "in_progress", "waiting_on_student"] as const;
const ALLOWED_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

type LiveSupportTicket = {
  id: string;
  status: string;
  priority: string;
  assigned_team: string | null;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as any).message ?? (error as any).details ?? (error as any).hint;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

async function findOpenLiveSupportTicket(
  supabaseUser: ReturnType<typeof createUserScopedSupabaseClient>,
  userId: string
): Promise<LiveSupportTicket | null> {
  const { data, error } = await supabaseUser
    .from("backoffice_tickets")
    .select("id, status, priority, assigned_team, assigned_to_user_id, created_at, updated_at")
    .eq("source_type", "support_request")
    .eq("student_user_id", userId)
    .in("status", OPEN_TICKET_STATUSES as unknown as string[])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  return (data?.[0] as LiveSupportTicket | undefined) ?? null;
}

async function findSupportRequestTicket(
  supabaseUser: ReturnType<typeof createUserScopedSupabaseClient>,
  supportRequestId: string
): Promise<LiveSupportTicket | null> {
  const { data, error } = await supabaseUser
    .from("backoffice_tickets")
    .select("id, status, priority, assigned_team, assigned_to_user_id, created_at, updated_at")
    .eq("source_type", "support_request")
    .eq("source_id", supportRequestId)
    .limit(1);

  if (error) {
    throw error;
  }

  return (data?.[0] as LiveSupportTicket | undefined) ?? null;
}

function normalizeDisplayName(rawName: unknown, email: string | null): string {
  const fromMetadata = typeof rawName === "string" ? rawName.trim() : "";
  if (fromMetadata) return fromMetadata.slice(0, 120);

  if (email && email.includes("@")) {
    return email.split("@")[0].slice(0, 120);
  }

  return "EduGuide user";
}

async function appendPublicMessage(
  supabaseUser: ReturnType<typeof createUserScopedSupabaseClient>,
  ticketId: string,
  authorUserId: string,
  body: string
) {
  const content = body.trim();
  if (!content) return;

  const { error } = await supabaseUser.from("backoffice_ticket_messages").insert({
    ticket_id: ticketId,
    author_user_id: authorUserId,
    visibility: "public",
    body: content,
  });

  if (error) {
    throw error;
  }
}

async function ensureBackofficeTicketForSupportRequest(params: {
  supportRequestId: string;
  userId: string;
  requesterEmail: string;
  displayName: string;
  initialMessage: string;
  priority: string;
}): Promise<void> {
  const { supportRequestId, userId, requesterEmail, displayName, initialMessage, priority } = params;

  const { data: existingRows, error: existingError } = await supabaseServer
    .from("backoffice_tickets")
    .select("id")
    .eq("source_type", "support_request")
    .eq("source_id", supportRequestId)
    .limit(1);

  if (!existingError && existingRows && existingRows.length > 0) {
    return;
  }

  const { error: insertTicketError } = await supabaseServer
    .from("backoffice_tickets")
    .insert({
      source_type: "support_request",
      source_id: supportRequestId,
      student_user_id: userId,
      requester_email: requesterEmail,
      title: `Live Chat Request: ${displayName}`,
      description: initialMessage || "User requested a live support conversation.",
      category: "support",
      priority,
      status: "new",
      assigned_team: "support",
      created_by_user_id: null,
    });

  if (insertTicketError) {
    const lower = insertTicketError.message?.toLowerCase() ?? "";
    const isDuplicate = lower.includes("duplicate") || lower.includes("already exists") || lower.includes("idx_backoffice_tickets_source_unique");
    if (!isDuplicate) {
      throw insertTicketError;
    }
  }
}

async function assignSupportAgentIfUnassigned(ticketId: string): Promise<void> {
  const { data: ticket, error: ticketError } = await supabaseServer
    .from("backoffice_tickets")
    .select("id, status, assigned_to_user_id")
    .eq("id", ticketId)
    .single();

  if (ticketError || !ticket || ticket.assigned_to_user_id) {
    return;
  }

  const { data: supportAgents, error: supportError } = await supabaseServer
    .from("user_roles")
    .select("user_id")
    .eq("role", "staff")
    .eq("staff_level", "support");

  if (supportError || !supportAgents || supportAgents.length === 0) {
    return;
  }

  const agentIds = supportAgents
    .map((row: any) => row.user_id)
    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0);

  if (agentIds.length === 0) {
    return;
  }

  const { data: activeTickets, error: activeError } = await supabaseServer
    .from("backoffice_tickets")
    .select("assigned_to_user_id, status")
    .in("assigned_to_user_id", agentIds)
    .in("status", OPEN_TICKET_STATUSES as unknown as string[]);

  if (activeError) {
    return;
  }

  const workload = new Map<string, number>();
  for (const agentId of agentIds) {
    workload.set(agentId, 0);
  }
  for (const row of activeTickets ?? []) {
    const assigned = typeof (row as any).assigned_to_user_id === "string" ? (row as any).assigned_to_user_id : null;
    if (!assigned || !workload.has(assigned)) continue;
    workload.set(assigned, (workload.get(assigned) ?? 0) + 1);
  }

  let selectedAgent = agentIds[0];
  let selectedCount = workload.get(selectedAgent) ?? Number.MAX_SAFE_INTEGER;
  for (const agentId of agentIds) {
    const count = workload.get(agentId) ?? 0;
    if (count < selectedCount) {
      selectedAgent = agentId;
      selectedCount = count;
    }
  }

  const { data: updatedTicket, error: updateError } = await supabaseServer
    .from("backoffice_tickets")
    .update({
      assigned_to_user_id: selectedAgent,
      assigned_team: "support",
      status: ticket.status === "new" ? "assigned" : ticket.status,
      assigned_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .is("assigned_to_user_id", null)
    .select("id")
    .single();

  if (updateError || !updatedTicket) {
    return;
  }

  await supabaseServer.from("backoffice_ticket_events").insert({
    ticket_id: ticketId,
    actor_user_id: null,
    action: "auto_assigned",
    old_status: ticket.status,
    new_status: ticket.status === "new" ? "assigned" : ticket.status,
    old_assignee_user_id: null,
    new_assignee_user_id: selectedAgent,
    metadata: {
      source: "live_support_session_fallback",
      assigned_team: "support",
    },
  });
}

export async function GET(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.isStaffView) {
      return NextResponse.json({ error: "Live support widget is available for student accounts only." }, { status: 403 });
    }

    const supabaseUser = createUserScopedSupabaseClient(request);
    const ticket = await findOpenLiveSupportTicket(supabaseUser, access.user.id);
    return NextResponse.json({ ticket });
  } catch (error) {
    const message = toErrorMessage(error, "Failed to load live support session.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (access.isStaffView) {
      return NextResponse.json({ error: "Live support widget is available for student accounts only." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const initialMessage = typeof body?.initialMessage === "string" ? body.initialMessage.trim() : "";
    const rawPriority = typeof body?.priority === "string" ? body.priority : "medium";
    const priority = ALLOWED_PRIORITIES.has(rawPriority) ? rawPriority : "medium";

    const supabaseUser = createUserScopedSupabaseClient(request);

    const existingTicket = await findOpenLiveSupportTicket(supabaseUser, access.user.id);
    if (existingTicket) {
      if (initialMessage) {
        await appendPublicMessage(supabaseUser, existingTicket.id, access.user.id, initialMessage);
      }
      return NextResponse.json({ ticket: existingTicket, created: false });
    }

    const displayName = normalizeDisplayName(
      access.user.user_metadata?.full_name ??
        access.user.user_metadata?.first_name ??
        access.user.email,
      access.user.email ?? null
    );
    const requesterEmail = access.user.email ?? "unknown@local";

    const { data: supportRequest, error: supportRequestError } = await supabaseUser
      .from("support_requests")
      .insert({
        user_id: access.user.id,
        name: displayName,
        email: requesterEmail,
        message: initialMessage || "User requested a live chat conversation from the support widget.",
        priority,
        source: "live_chat_widget",
      })
      .select("id")
      .single();

    if (supportRequestError) {
      throw supportRequestError;
    }

    let ticket = await findSupportRequestTicket(supabaseUser, supportRequest.id);
    if (!ticket) {
      await ensureBackofficeTicketForSupportRequest({
        supportRequestId: supportRequest.id,
        userId: access.user.id,
        requesterEmail,
        displayName,
        initialMessage,
        priority,
      });
      ticket = await findSupportRequestTicket(supabaseUser, supportRequest.id);
    }

    if (!ticket) {
      return NextResponse.json(
        {
          error:
            "Support request was saved but no linked backoffice ticket could be loaded. Run the latest DB migrations for backoffice ticket triggers.",
        },
        { status: 500 }
      );
    }

    if (!ticket.assigned_to_user_id) {
      await assignSupportAgentIfUnassigned(ticket.id);
      ticket = await findSupportRequestTicket(supabaseUser, supportRequest.id);
    }
    if (!ticket) {
      return NextResponse.json({ error: "Live support ticket could not be loaded after assignment step." }, { status: 500 });
    }

    const starterMessage = initialMessage || "I would like to speak with a support agent.";
    await appendPublicMessage(supabaseUser, ticket.id, access.user.id, starterMessage);

    return NextResponse.json({ ticket, created: true }, { status: 201 });
  } catch (error) {
    const message = toErrorMessage(error, "Failed to start live support session.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
