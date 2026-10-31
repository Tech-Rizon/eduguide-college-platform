import { collegeDatabase, type CollegeEntry } from "./collegeDatabase";
import type { CollegeCatalogListResult } from "./collegeCatalog";
import { COLLEGE_TYPES } from "./collegeCatalog";
import { supabaseServer } from "./supabaseServer";

type CollegeRow = {
  id: string;
  name: string;
  location: string;
  state: string;
  city: string;
  type: CollegeEntry["type"];
  tuition_in_state: number | null;
  tuition_out_state: number | null;
  tuition_display: string | null;
  acceptance_rate_display: string | null;
  acceptance_rate_num: number | null;
  min_gpa: number | null;
  avg_gpa: number | null;
  ranking: number | null;
  enrollment_size: number | null;
  majors: string[] | null;
  tags: string[] | null;
  sat_range: string | null;
  act_range: string | null;
  financial_aid_percent: number | null;
  avg_aid_amount: number | null;
  graduation_rate: number | null;
  description: string | null;
  website: string | null;
  region: string | null;
  source_type: string | null;
  source_url: string | null;
  source_metadata: Record<string, unknown> | null;
  source_last_scraped_at: string | null;
  is_active: boolean | null;
};

type CollegeRowInsert = {
  id: string;
  name: string;
  location: string;
  state: string;
  city: string;
  type: CollegeEntry["type"];
  tuition_in_state: number;
  tuition_out_state: number;
  tuition_display: string;
  acceptance_rate_display: string;
  acceptance_rate_num: number;
  min_gpa: number;
  avg_gpa: number;
  ranking: number;
  enrollment_size: number;
  majors: string[];
  tags: string[];
  sat_range: string;
  act_range: string;
  financial_aid_percent: number;
  avg_aid_amount: number;
  graduation_rate: number;
  description: string;
  website: string;
  region: string;
  source_type: string;
  source_url: string | null;
  source_metadata: Record<string, unknown> | null;
  source_last_scraped_at: string | null;
  is_active: boolean;
};

type StaticSearchOptions = {
  query?: string;
  state?: string;
  type?: string;
  maxTuition?: number;
  limit?: number;
  offset?: number;
};

export type CollegeCatalogUpsertInput = Partial<CollegeEntry> & {
  id?: string;
  name: string;
  sourceType?: "manual" | "static_seed" | "firecrawl" | "import";
  sourceUrl?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
  sourceLastScrapedAt?: string | null;
  isActive?: boolean;
};

const COLLEGE_SELECT =
  "id, name, location, state, city, type, tuition_in_state, tuition_out_state, tuition_display, acceptance_rate_display, acceptance_rate_num, min_gpa, avg_gpa, ranking, enrollment_size, majors, tags, sat_range, act_range, financial_aid_percent, avg_aid_amount, graduation_rate, description, website, region, source_type, source_url, source_metadata, source_last_scraped_at, is_active";

function inferRegionFromState(state: string): string {
  switch (state.toUpperCase()) {
    case "CT":
    case "ME":
    case "MA":
    case "NH":
    case "RI":
    case "VT":
    case "NJ":
    case "NY":
    case "PA":
      return "Northeast";
    case "IL":
    case "IN":
    case "MI":
    case "OH":
    case "WI":
    case "IA":
    case "KS":
    case "MN":
    case "MO":
    case "NE":
    case "ND":
    case "SD":
      return "Midwest";
    case "DE":
    case "FL":
    case "GA":
    case "MD":
    case "NC":
    case "SC":
    case "VA":
    case "DC":
    case "WV":
    case "AL":
    case "KY":
    case "MS":
    case "TN":
    case "AR":
    case "LA":
    case "OK":
    case "TX":
      return "South";
    case "AZ":
    case "CO":
    case "ID":
    case "MT":
    case "NV":
    case "NM":
    case "UT":
    case "WY":
    case "AK":
    case "CA":
    case "HI":
    case "OR":
    case "WA":
      return "West";
    default:
      return "";
  }
}

function normalizeCollegeType(type: string | undefined): CollegeEntry["type"] {
  return COLLEGE_TYPES.includes(type as CollegeEntry["type"])
    ? (type as CollegeEntry["type"])
    : "Public University";
}

function normalizeStringArray(values: string[] | undefined): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => value.trim()).filter(Boolean))
  );
}

function buildTuitionDisplay(tuitionInState: number, tuitionOutState: number): string {
  if (tuitionInState > 0 && tuitionOutState > 0 && tuitionInState !== tuitionOutState) {
    return `$${tuitionInState.toLocaleString()} (in-state) / $${tuitionOutState.toLocaleString()} (out-of-state)`;
  }

  const value = tuitionInState > 0 ? tuitionInState : tuitionOutState;
  return value > 0 ? `$${value.toLocaleString()}` : "Contact school";
}

function buildAcceptanceRateDisplay(acceptanceRateNum: number): string {
  if (acceptanceRateNum >= 0.999) {
    return "Open Enrollment";
  }

  if (acceptanceRateNum <= 0) {
    return "N/A";
  }

  return `${Math.round(acceptanceRateNum * 100)}%`;
}

function slugifyCollegeId(name: string, state?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return state ? `${slug}-${state.toLowerCase()}` : slug;
}

function rowToCollegeEntry(row: CollegeRow): CollegeEntry {
  const tuitionInState = row.tuition_in_state ?? 0;
  const tuitionOutState = row.tuition_out_state ?? tuitionInState;
  const acceptanceRateNum = row.acceptance_rate_num ?? 0;

  return {
    id: row.id,
    name: row.name,
    location: row.location,
    state: row.state,
    city: row.city,
    type: row.type,
    tuitionInState,
    tuitionOutState,
    tuition: row.tuition_display?.trim() || buildTuitionDisplay(tuitionInState, tuitionOutState),
    acceptanceRate:
      row.acceptance_rate_display?.trim() || buildAcceptanceRateDisplay(acceptanceRateNum),
    acceptanceRateNum,
    minGPA: Number(row.min_gpa ?? 0),
    avgGPA: Number(row.avg_gpa ?? 0),
    ranking: row.ranking ?? 999999,
    enrollmentSize: row.enrollment_size ?? 0,
    majors: normalizeStringArray(row.majors ?? []),
    tags: normalizeStringArray(row.tags ?? []),
    satRange: row.sat_range?.trim() || "N/A",
    actRange: row.act_range?.trim() || "N/A",
    financialAidPercent: row.financial_aid_percent ?? 0,
    avgAidAmount: row.avg_aid_amount ?? 0,
    graduationRate: row.graduation_rate ?? 0,
    description: row.description?.trim() || "",
    website: row.website?.trim() || "",
    region: row.region?.trim() || inferRegionFromState(row.state),
  };
}

function staticSearchCatalog(options: StaticSearchOptions): CollegeCatalogListResult {
  const query = options.query?.trim().toLowerCase() ?? "";
  const state = options.state?.trim().toUpperCase() ?? "";
  const type = options.type?.trim() ?? "";
  const maxTuition = options.maxTuition;
  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit && options.limit > 0 ? options.limit : collegeDatabase.length;

  let results = [...collegeDatabase];

  if (query) {
    results = results.filter(
      (college) =>
        college.name.toLowerCase().includes(query) ||
        college.location.toLowerCase().includes(query) ||
        college.state.toLowerCase().includes(query) ||
        college.city.toLowerCase().includes(query) ||
        college.description.toLowerCase().includes(query) ||
        college.majors.some((major) => major.toLowerCase().includes(query)) ||
        college.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  if (state) {
    results = results.filter((college) => college.state === state);
  }

  if (type) {
    results = results.filter((college) => college.type === type);
  }

  if (typeof maxTuition === "number" && Number.isFinite(maxTuition)) {
    results = results.filter((college) => college.tuitionInState <= maxTuition);
  }

  results.sort((a, b) => a.ranking - b.ranking || a.name.localeCompare(b.name));

  return {
    colleges: results.slice(offset, offset + limit),
    total: results.length,
    source: "static",
  };
}

async function isDatabaseCatalogSeeded(): Promise<boolean> {
  const { count, error } = await supabaseServer
    .from("colleges")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}

export async function listCollegeCatalog(
  options: StaticSearchOptions = {}
): Promise<CollegeCatalogListResult> {
  const catalogReady = await isDatabaseCatalogSeeded();
  if (!catalogReady) {
    return staticSearchCatalog(options);
  }

  const query = options.query?.trim().toLowerCase() ?? "";
  const state = options.state?.trim().toUpperCase() ?? "";
  const type = options.type?.trim() ?? "";
  const maxTuition = options.maxTuition;
  const offset = Math.max(0, options.offset ?? 0);
  const limit = options.limit && options.limit > 0 ? options.limit : 24;

  let request = supabaseServer
    .from("colleges")
    .select(COLLEGE_SELECT, { count: "exact" })
    .eq("is_active", true);

  if (query) {
    request = request.ilike("search_text", `%${query}%`);
  }

  if (state) {
    request = request.eq("state", state);
  }

  if (type) {
    request = request.eq("type", type);
  }

  if (typeof maxTuition === "number" && Number.isFinite(maxTuition)) {
    request = request.lte("tuition_in_state", maxTuition);
  }

  const { data, count, error } = await request
    .order("ranking", { ascending: true })
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("college catalog database query failed:", error);
    return staticSearchCatalog(options);
  }

  return {
    colleges: ((data ?? []) as CollegeRow[]).map(rowToCollegeEntry),
    total: count ?? 0,
    source: "database",
  };
}

export async function findCollegeCatalogEntryById(collegeId: string): Promise<CollegeEntry | null> {
  const trimmedId = collegeId.trim();
  if (!trimmedId) return null;

  if (await isDatabaseCatalogSeeded()) {
    const { data, error } = await supabaseServer
      .from("colleges")
      .select(COLLEGE_SELECT)
      .eq("id", trimmedId)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return rowToCollegeEntry(data as CollegeRow);
    }
  }

  return collegeDatabase.find((college) => college.id === trimmedId) ?? null;
}

export function staticCollegeToCatalogUpsertInput(
  college: CollegeEntry
): CollegeCatalogUpsertInput {
  return {
    ...college,
    sourceType: "static_seed",
    sourceUrl: college.website,
    isActive: true,
  };
}

function inputToCollegeRow(input: CollegeCatalogUpsertInput): CollegeRowInsert {
  const state = (input.state ?? "").trim().toUpperCase();
  const city = input.city?.trim() ?? "";
  const location =
    input.location?.trim() ||
    [city, state].filter(Boolean).join(", ") ||
    input.name.trim();
  const tuitionInState = Math.max(0, Number(input.tuitionInState ?? 0));
  const tuitionOutState = Math.max(
    0,
    Number(input.tuitionOutState ?? input.tuitionInState ?? 0)
  );
  const acceptanceRateNum = Math.max(0, Number(input.acceptanceRateNum ?? 0));

  return {
    id: input.id?.trim() || slugifyCollegeId(input.name, state),
    name: input.name.trim(),
    location,
    state,
    city,
    type: normalizeCollegeType(input.type),
    tuition_in_state: tuitionInState,
    tuition_out_state: tuitionOutState,
    tuition_display:
      input.tuition?.trim() || buildTuitionDisplay(tuitionInState, tuitionOutState),
    acceptance_rate_display:
      input.acceptanceRate?.trim() || buildAcceptanceRateDisplay(acceptanceRateNum),
    acceptance_rate_num: acceptanceRateNum,
    min_gpa: Math.max(0, Number(input.minGPA ?? 0)),
    avg_gpa: Math.max(0, Number(input.avgGPA ?? 0)),
    ranking: Math.max(0, Number(input.ranking ?? 999999)),
    enrollment_size: Math.max(0, Number(input.enrollmentSize ?? 0)),
    majors: normalizeStringArray(input.majors),
    tags: normalizeStringArray(input.tags),
    sat_range: input.satRange?.trim() || "N/A",
    act_range: input.actRange?.trim() || "N/A",
    financial_aid_percent: Math.max(0, Number(input.financialAidPercent ?? 0)),
    avg_aid_amount: Math.max(0, Number(input.avgAidAmount ?? 0)),
    graduation_rate: Math.max(0, Number(input.graduationRate ?? 0)),
    description: input.description?.trim() || "",
    website: input.website?.trim() || "",
    region: input.region?.trim() || inferRegionFromState(state),
    source_type: input.sourceType ?? "manual",
    source_url: input.sourceUrl?.trim() || input.website?.trim() || null,
    source_metadata: input.sourceMetadata ?? null,
    source_last_scraped_at: input.sourceLastScrapedAt ?? null,
    is_active: input.isActive ?? true,
  };
}

export async function upsertCollegeCatalog(
  inputs: CollegeCatalogUpsertInput[]
): Promise<CollegeEntry[]> {
  if (inputs.length === 0) return [];

  const rows = inputs.map(inputToCollegeRow);
  const { data, error } = await supabaseServer
    .from("colleges")
    .upsert(rows, { onConflict: "id" })
    .select(COLLEGE_SELECT);

  if (error) {
    throw error;
  }

  return ((data ?? []) as CollegeRow[]).map(rowToCollegeEntry);
}
