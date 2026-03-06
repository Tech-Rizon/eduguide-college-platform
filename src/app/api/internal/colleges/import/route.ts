import { NextResponse } from "next/server";
import {
  runCollegeCatalogImport,
  type CollegeCatalogImportRequestBody,
} from "@/lib/collegeCatalogImportServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = request.headers.get("x-college-catalog-token");
    if (!token || token !== process.env.COLLEGE_CATALOG_IMPORT_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
