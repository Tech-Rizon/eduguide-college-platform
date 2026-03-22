import { NextResponse } from "next/server";
import {
  getStudentMatchProfile,
  normalizeStudentMatchProfile,
  upsertStudentMatchProfile,
} from "@/lib/collegeMatchServer";
import type { StudentMatchProfile } from "@/lib/collegeMatchTypes";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
}

export async function GET(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getStudentMatchProfile(userId);
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch match profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Partial<StudentMatchProfile>;
    const profile = normalizeStudentMatchProfile(body);

    const savedProfile = await upsertStudentMatchProfile(userId, profile);
    return NextResponse.json({ profile: savedProfile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save match profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
