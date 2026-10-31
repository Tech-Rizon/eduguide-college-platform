import { NextResponse } from "next/server";
import { resolveAccessFromRequest } from "@/lib/accessControl";
import {
  getCollegeCatalogAdminSummary,
  runCollegeCatalogImport,
  type CollegeCatalogImportRequestBody,
} from "@/lib/collegeCatalogImportServer";

export const dynamic = "force-dynamic";

async function requireSuperAdmin(request: Request) {
  const access = await resolveAccessFromRequest(request);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!access.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (access.mfaRequired) {
    return NextResponse.json({ error: "MFA required for super admin access" }, { status: 403 });
  }

  return access;
}

export async function GET(request: Request) {
  const access = await requireSuperAdmin(request);
  if (access instanceof NextResponse) {
    return access;
  }

  try {
    const summary = await getCollegeCatalogAdminSummary();
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load college catalog summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireSuperAdmin(request);
  if (access instanceof NextResponse) {
    return access;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as CollegeCatalogImportRequestBody;
    const result = await runCollegeCatalogImport(body);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import colleges";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
