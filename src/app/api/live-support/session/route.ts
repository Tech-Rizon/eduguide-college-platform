import { NextResponse } from "next/server";
import { resolveAccessFromRequest } from "@/lib/accessControl";
import { createUserScopedSupabaseClient } from "@/lib/supabaseRequest";

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
    const message = error instanceof Error ? error.message : "Failed to load live support session.";
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

    const { data: ticketRows, error: ticketLookupError } = await supabaseUser
      .from("backoffice_tickets")
      .select("id, status, priority, assigned_team, assigned_to_user_id, created_at, updated_at")
      .eq("source_type", "support_request")
      .eq("source_id", supportRequest.id)
      .limit(1);

    if (ticketLookupError) {
      throw ticketLookupError;
    }

    const ticket = (ticketRows?.[0] as LiveSupportTicket | undefined) ?? null;
    if (!ticket) {
      return NextResponse.json({ error: "Live support ticket was created but could not be loaded yet." }, { status: 500 });
    }

    const starterMessage = initialMessage || "I would like to speak with a support agent.";
    await appendPublicMessage(supabaseUser, ticket.id, access.user.id, starterMessage);

    return NextResponse.json({ ticket, created: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start live support session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
