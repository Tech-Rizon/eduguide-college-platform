import { collegeDatabase } from "@/lib/collegeDatabase";
import {
  staticCollegeToCatalogUpsertInput,
  upsertCollegeCatalog,
  type CollegeCatalogUpsertInput,
} from "@/lib/collegeCatalogServer";
import { supabaseServer } from "@/lib/supabaseServer";

interface FirecrawlScrapePayload {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
      url?: string;
    };
  };
  error?: string;
}

export type ImportCollegeRequest = Partial<CollegeCatalogUpsertInput> & {
  enrichFromWebsite?: boolean;
};

export type CollegeCatalogImportRequestBody = {
  seedStatic?: boolean;
  useFirecrawl?: boolean;
  colleges?: ImportCollegeRequest[];
};

export type CollegeCatalogImportResult =
  | {
      ok: true;
      importedCount: number;
      preparedCount: number;
      results: Array<Record<string, unknown>>;
    }
  | {
      ok: false;
      error: string;
      results: Array<Record<string, unknown>>;
    };

export type CollegeCatalogAdminSummary = {
  totalActiveColleges: number;
  latestUpdatedAt: string | null;
  latestScrapedAt: string | null;
};

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

function summarizeMarkdown(markdown: string): string {
  const candidates = markdown
    .split(/\n+/)
    .map((line) => line.replace(/[#>*`-]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 60 && line.length <= 240);

  return candidates.slice(0, 2).join(" ").slice(0, 360);
}

async function enrichWithFirecrawl(
  college: ImportCollegeRequest
): Promise<Partial<CollegeCatalogUpsertInput>> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  if (!college.website?.trim()) {
    throw new Error("A website is required for Firecrawl enrichment.");
  }

  const response = await fetch(FIRECRAWL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: college.website.trim(),
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 25000,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as FirecrawlScrapePayload;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.error || "Firecrawl scrape failed.");
  }

  const metadata = payload.data.metadata ?? {};
  const markdown = payload.data.markdown?.trim() ?? "";
  const summary =
    metadata.description?.trim() ||
    summarizeMarkdown(markdown) ||
    college.description?.trim() ||
    "";

  return {
    description: summary,
    sourceType: "firecrawl",
    sourceUrl: metadata.sourceURL?.trim() || metadata.url?.trim() || college.website.trim(),
    sourceMetadata: {
      firecrawl: {
        title: metadata.title?.trim() || null,
        description: metadata.description?.trim() || null,
        scrapedFrom: college.website.trim(),
      },
    },
    sourceLastScrapedAt: new Date().toISOString(),
  };
}

export async function runCollegeCatalogImport(
  body: CollegeCatalogImportRequestBody
): Promise<CollegeCatalogImportResult> {
  const prepared: CollegeCatalogUpsertInput[] = [];
  const results: Array<Record<string, unknown>> = [];

  if (body.seedStatic) {
    prepared.push(...collegeDatabase.map(staticCollegeToCatalogUpsertInput));
    results.push({
      status: "prepared",
      kind: "static-seed",
      count: collegeDatabase.length,
    });
  }

  for (const draft of body.colleges ?? []) {
    const name = typeof draft.name === "string" ? draft.name.trim() : "";
    if (!name) {
      results.push({
        status: "failed",
        name: draft.name ?? null,
        error: "Each imported college needs a name.",
      });
      continue;
    }

    try {
      const shouldEnrich = Boolean(body.useFirecrawl || draft.enrichFromWebsite);
      const enrichment = shouldEnrich ? await enrichWithFirecrawl(draft) : {};
      prepared.push({
        ...draft,
        ...enrichment,
        name,
        sourceMetadata: {
          ...(draft.sourceMetadata ?? {}),
          ...(enrichment.sourceMetadata ?? {}),
        },
      });
      results.push({
        status: "prepared",
        kind: "custom",
        name,
        usedFirecrawl: shouldEnrich,
      });
    } catch (error) {
      results.push({
        status: "failed",
        kind: "custom",
        name,
        error: error instanceof Error ? error.message : "Failed to prepare college import.",
      });
    }
  }

  if (prepared.length === 0) {
    return {
      ok: false,
      error: "No colleges were prepared for import.",
      results,
    };
  }

  const imported = await upsertCollegeCatalog(prepared);

  return {
    ok: true,
    importedCount: imported.length,
    preparedCount: prepared.length,
    results,
  };
}

export async function getCollegeCatalogAdminSummary(): Promise<CollegeCatalogAdminSummary> {
  const [
    { count, error: countError },
    { data: updatedRows, error: updatedError },
    { data: scrapedRows, error: scrapedError },
  ] = await Promise.all([
    supabaseServer
      .from("colleges")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabaseServer
      .from("colleges")
      .select("updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabaseServer
      .from("colleges")
      .select("source_last_scraped_at")
      .eq("is_active", true)
      .not("source_last_scraped_at", "is", null)
      .order("source_last_scraped_at", { ascending: false })
      .limit(1),
  ]);

  if (countError) throw countError;
  if (updatedError) throw updatedError;
  if (scrapedError) throw scrapedError;

  return {
    totalActiveColleges: count ?? 0,
    latestUpdatedAt:
      ((updatedRows ?? []) as Array<{ updated_at: string | null }>)[0]?.updated_at ?? null,
    latestScrapedAt:
      ((scrapedRows ?? []) as Array<{ source_last_scraped_at: string | null }>)[0]
        ?.source_last_scraped_at ?? null,
  };
}
