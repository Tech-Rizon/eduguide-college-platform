import { findCollegeCatalogEntryById } from "./collegeCatalogServer";
import { getStudentMatchProfile, matchCollegePrograms } from "./collegeMatchServer";
import type { CollegeEntry } from "./collegeDatabase";
import type { StudentMatchProfile } from "./collegeMatchTypes";

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";

type FirecrawlPayload = {
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
};

export interface FirecrawlPageResult {
  markdown: string;
  sourceUrl: string;
  title: string | null;
  description: string | null;
}

export interface CollegePlanningResearch {
  summary: string;
  deadline: string | null;
  sourceUrl: string;
}

function appendResearchPacket(base: string, packet: string): string {
  const trimmedBase = base.trim();
  const trimmedPacket = packet.trim();
  if (!trimmedPacket) return trimmedBase;
  if (!trimmedBase) return trimmedPacket;
  return `${trimmedBase}\n\n${trimmedPacket}`;
}

function cleanLine(line: string): string {
  return line.replace(/[#>*`-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function summarizeMarkdown(markdown: string, minLength = 45, maxLength = 240): string {
  return markdown
    .split(/\n+/)
    .map(cleanLine)
    .filter((line) => line.length >= minLength && line.length <= maxLength)
    .slice(0, 2)
    .join(" ")
    .slice(0, 420);
}

export function extractDeadlineFromMarkdown(markdown: string): string | null {
  const match = markdown.match(
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s+\d{4})?/i
  );
  return match?.[0]?.trim() || null;
}

export async function scrapeWebPage(url: string): Promise<FirecrawlPageResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || !url.trim()) return null;

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 25000,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as FirecrawlPayload;
    if (!response.ok || !payload.success || !payload.data) {
      return null;
    }

    const metadata = payload.data.metadata ?? {};
    return {
      markdown: payload.data.markdown?.trim() ?? "",
      sourceUrl: metadata.sourceURL?.trim() || metadata.url?.trim() || url.trim(),
      title: metadata.title?.trim() || null,
      description: metadata.description?.trim() || null,
    };
  } catch (error) {
    console.error(`Firecrawl scrape failed for ${url}:`, error);
    return null;
  }
}

export async function buildCollegePlanningResearch(
  college: CollegeEntry
): Promise<CollegePlanningResearch | null> {
  if (!college.website?.trim()) return null;

  const page = await scrapeWebPage(college.website);
  if (!page) return null;

  const summary =
    page.description ||
    summarizeMarkdown(page.markdown) ||
    college.description ||
    "";

  return {
    summary,
    deadline: extractDeadlineFromMarkdown(page.markdown),
    sourceUrl: page.sourceUrl,
  };
}

export async function buildCollegePlanningResearchById(
  collegeId: string
): Promise<CollegePlanningResearch | null> {
  const college = await findCollegeCatalogEntryById(collegeId);
  if (!college) return null;
  return buildCollegePlanningResearch(college);
}

export async function buildEssayFeedbackContext(
  collegeId: string | null | undefined,
  collegeName: string | null | undefined
): Promise<string> {
  if (!collegeId?.trim()) return "";

  const college = await findCollegeCatalogEntryById(collegeId);
  if (!college?.website) return "";

  const page = await scrapeWebPage(college.website);
  if (!page) return "";

  const summary = page.description || summarizeMarkdown(page.markdown);
  const deadline = extractDeadlineFromMarkdown(page.markdown);
  const bits = [
    `Official school context for ${collegeName?.trim() || college.name}:`,
    summary ? `- Site summary: ${summary}` : "",
    deadline ? `- Deadline mention: ${deadline}` : "",
    `- Source: ${page.sourceUrl}`,
  ].filter(Boolean);

  return bits.join("\n");
}

function buildResearchPacketText(results: Awaited<ReturnType<typeof matchCollegePrograms>>["results"]) {
  return results
    .slice(0, 2)
    .map(
      (result) =>
        `- ${result.college.name} / ${result.program.programName}: ${result.whyFit.join(" ") || "Potential fit."}${
          result.blockers.length ? ` Blockers: ${result.blockers.join(" ")}` : ""
        }${result.program.admissionsUrl ? ` Admissions: ${result.program.admissionsUrl}` : ""}`
    )
    .join("\n");
}

export async function buildSupportResearchPacket(params: {
  message: string;
  userId?: string | null;
}): Promise<string> {
  const message = params.message.trim();
  if (!message || message.length < 8) return "";

  let storedProfile: StudentMatchProfile | null = null;
  if (params.userId) {
    try {
      storedProfile = await getStudentMatchProfile(params.userId);
    } catch {
      storedProfile = null;
    }
  }

  const matchResponse = await matchCollegePrograms({
    storedProfile,
    query: message,
    limit: 2,
  }).catch(() => null);

  if (!matchResponse?.results?.length) return "";

  return [
    "Official research packet:",
    buildResearchPacketText(matchResponse.results),
  ].join("\n");
}

export function mergeWithResearchPacket(base: string, packet: string): string {
  return appendResearchPacket(base, packet);
}

export async function importWebContentAsText(url: string): Promise<{
  name: string;
  content: string;
  sourceUrl: string;
} | null> {
  const page = await scrapeWebPage(url);
  if (!page) return null;

  const content = page.markdown
    .split(/\n+/)
    .map(cleanLine)
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 100_000);

  if (content.trim().length < 50) return null;

  return {
    name: page.title || `Imported from ${new URL(page.sourceUrl).hostname}`,
    content,
    sourceUrl: page.sourceUrl,
  };
}
