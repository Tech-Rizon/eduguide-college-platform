import { NextResponse } from "next/server";
import {
  enrichCollegeProgramById,
  refreshStaleProgramData,
} from "@/lib/collegeProgramCatalogServer";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const token = request.headers.get("x-college-catalog-token");
  const expected =
    process.env.COLLEGE_PROGRAM_ENRICH_TOKEN || process.env.COLLEGE_CATALOG_IMPORT_TOKEN;

  return Boolean(token && expected && token === expected);
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      programIds?: unknown;
      staleOnly?: unknown;
      limit?: unknown;
    };

    const limit =
      typeof body.limit === "number"
        ? body.limit
        : typeof body.limit === "string"
          ? Number.parseInt(body.limit, 10)
          : 10;

    if (Array.isArray(body.programIds) && body.programIds.length > 0) {
      const ids = body.programIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
      const results = await Promise.allSettled(ids.map((id) => enrichCollegeProgramById(id.trim())));
      const refreshed = results.filter(
        (result) => result.status === "fulfilled" && result.value === true
      ).length;

      return NextResponse.json({
        ok: true,
        refreshed,
        attempted: ids.length,
      });
    }

    const refreshed = await refreshStaleProgramData(limit);
    return NextResponse.json({
      ok: true,
      refreshed,
      attempted: refreshed,
      staleOnly: body.staleOnly !== false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to refresh college program data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
