import { NextResponse } from "next/server";
import { generateAiChatResponse } from "@/lib/aiChatServer";
import type { AIChatTurn } from "@/lib/aiChatTypes";
import type { UserProfile } from "@/lib/aiEngine";

export const runtime = "nodejs";

interface AIChatRequestBody {
  currentProfile?: UserProfile;
  history?: AIChatTurn[];
  message?: string;
  mode?: "demo" | "dashboard";
  userName?: string;
}

function sanitizeHistory(history: unknown): AIChatTurn[] {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = "role" in item ? item.role : null;
      const content = "content" in item ? item.content : null;

      if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
        return null;
      }

      const trimmed = content.trim();
      if (!trimmed) return null;

      return {
        role,
        content: trimmed.slice(0, 4000),
      };
    })
    .filter((item): item is AIChatTurn => Boolean(item))
    .slice(-14);
}

// Attempt to verify the Bearer token and extract userId for analytics/rate-limiting.
// Returns null for unauthenticated callers (demo mode) — does NOT block the request.
async function tryExtractUserId(request: Request): Promise<string | null> {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return null;

    const sb = createClient(supabaseUrl, serviceKey);
    const { data } = await sb.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // Clone before reading body (auth check reads headers only, so no clone needed)
    const userId = await tryExtractUserId(request);
    const body = (await request.json().catch(() => ({}))) as AIChatRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const result = await generateAiChatResponse({
      currentProfile: body.currentProfile || {},
      history: sanitizeHistory(body.history),
      message: message.slice(0, 4000),
      mode: body.mode === "demo" ? "demo" : userId ? "dashboard" : "demo",
      userName: typeof body.userName === "string" ? body.userName.trim().slice(0, 80) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI chat route failed:", error);
    return NextResponse.json(
      { error: "The assistant could not respond right now. Please try again." },
      { status: 500 }
    );
  }
}
