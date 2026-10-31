import { NextResponse } from "next/server";
import {
  getStudentMatchProfile,
  matchCollegePrograms,
  normalizeStudentMatchProfile,
} from "@/lib/collegeMatchServer";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function tryExtractUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
}

export async function POST(request: Request) {
  try {
    const userId = await tryExtractUserId(request);
    const body = (await request.json().catch(() => ({}))) as {
      profileOverrides?: Record<string, unknown>;
      query?: unknown;
      limit?: unknown;
    };

    const storedProfile = userId ? await getStudentMatchProfile(userId) : null;
    const profileOverrides = normalizeStudentMatchProfile({
      ...(body.profileOverrides ?? {}),
    });
    const limit =
      typeof body.limit === "number"
        ? body.limit
        : typeof body.limit === "string"
          ? Number.parseInt(body.limit, 10)
          : undefined;

    const result = await matchCollegePrograms({
      storedProfile,
      profileOverrides,
      query: typeof body.query === "string" ? body.query : "",
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to match college programs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
