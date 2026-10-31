import { NextResponse } from "next/server";
import { COLLEGE_TYPES } from "@/lib/collegeCatalog";
import { listCollegeCatalog } from "@/lib/collegeCatalogServer";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query = searchParams.get("query")?.trim() ?? "";
    const state = searchParams.get("state")?.trim().toUpperCase() ?? "";
    const type = searchParams.get("type")?.trim() ?? "";
    const maxTuitionRaw = searchParams.get("maxTuition")?.trim() ?? "";
    const maxTuition = maxTuitionRaw ? Number.parseInt(maxTuitionRaw, 10) : undefined;
    const limit = parsePositiveInt(searchParams.get("limit"), 24, 100);
    const offset = parsePositiveInt(searchParams.get("offset"), 0, 10000);

    if (type && !COLLEGE_TYPES.includes(type as (typeof COLLEGE_TYPES)[number])) {
      return NextResponse.json({ error: "Invalid college type" }, { status: 400 });
    }

    if (maxTuitionRaw && (!maxTuition || Number.isNaN(maxTuition) || maxTuition < 0)) {
      return NextResponse.json({ error: "Invalid maxTuition" }, { status: 400 });
    }

    const result = await listCollegeCatalog({
      query,
      state,
      type,
      maxTuition,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load college catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
