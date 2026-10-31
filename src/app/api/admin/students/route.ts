import { NextResponse } from "next/server";
import { resolveAccessFromRequest } from "@/lib/accessControl";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await resolveAccessFromRequest(request);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!access.canManageTickets && !access.canManageRoles) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") ?? "all";

    // Fetch all leads
    const { data: leads, error: leadsError } = await supabaseServer
      .from("student_leads")
      .select("id, first_name, last_name, email, phone, notes, created_at")
      .order("created_at", { ascending: false });

    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Fetch all auth users to check which emails have accounts
    const { data: usersData } = await supabaseServer.auth.admin.listUsers({
      page: 1,
      perPage: 10000,
    });
    const authEmailSet = new Set<string>();
    const authEmailToId = new Map<string, string>();
    for (const u of usersData?.users ?? []) {
      if (u.email) {
        authEmailSet.add(u.email.toLowerCase());
        authEmailToId.set(u.email.toLowerCase(), u.id);
      }
    }

    // Fetch active subscriptions to check which users are subscribed
    const { data: subs } = await supabaseServer
      .from("subscriptions")
      .select("user_id, status")
      .eq("status", "active");

    const subscribedUserIds = new Set<string>(
      (subs ?? []).map((s: { user_id: string }) => s.user_id)
    );

    // Compute status for each lead
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

    const students: StudentLead[] = (leads as {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
      notes: string | null;
      created_at: string;
    }[]).map((lead) => {
      const emailLower = lead.email.toLowerCase();
      const authUserId = authEmailToId.get(emailLower);
      let status: "lead" | "registered" | "subscribed" = "lead";
      if (authUserId) {
        status = subscribedUserIds.has(authUserId) ? "subscribed" : "registered";
      }
      return { ...lead, status };
    });

    // Apply status filter
    const filtered =
      statusFilter === "all"
        ? students
        : students.filter((s) => s.status === statusFilter);

    return NextResponse.json({ students: filtered });
  } catch (err) {
    console.error("GET /api/admin/students error:", err);
    return NextResponse.json({ error: "Failed to load students." }, { status: 500 });
  }
}
