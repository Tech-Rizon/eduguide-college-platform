import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars not configured");
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 50) : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim().slice(0, 50) : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 30) || null : null;

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const sb = getServiceClient();

    // Check if this email already has a Supabase auth account
    const { data: authUsers } = await sb.auth.admin.listUsers();
    const alreadyRegistered = authUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email
    );
    if (alreadyRegistered) {
      return NextResponse.json({ code: "already_registered" }, { status: 409 });
    }

    // Upsert the lead (on conflict email: update name/phone in case they re-submitted)
    const { data, error } = await sb
      .from("student_leads")
      .upsert(
        { first_name: firstName, last_name: lastName, email, phone },
        { onConflict: "email", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (error) {
      console.error("Lead upsert error:", error);
      return NextResponse.json({ error: "Could not save your information." }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("POST /api/leads error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
