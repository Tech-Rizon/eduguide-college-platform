import { collegeDatabase, type CollegeEntry } from "./collegeDatabase";
import type {
  CollegeMatchResult,
  CollegeProgram,
  DegreeLevel,
  ProgramExtractionStatus,
  ProgramModality,
  ProgramRequirement,
  ProgramRequirementType,
} from "./collegeMatchTypes";
import { supabaseServer } from "./supabaseServer";

interface ProgramRow {
  id: string;
  college_id: string;
  program_name: string;
  program_slug: string;
  degree_level: DegreeLevel;
  modality: ProgramModality;
  campus_name: string | null;
  department_name: string | null;
  program_url: string | null;
  admissions_url: string | null;
  application_deadline: string | null;
  start_terms: string[] | null;
  transfer_friendly: boolean | null;
  freshman_open: boolean | null;
  international_open: boolean | null;
  requires_portfolio: boolean | null;
  requires_audition: boolean | null;
  requires_background_check: boolean | null;
  accreditation: string | null;
  extraction_status: ProgramExtractionStatus | null;
  last_scraped_at: string | null;
  source_metadata: Record<string, unknown> | null;
  colleges?: CollegeRow | null;
  program_requirements?: ProgramRequirementRow[] | null;
}

interface ProgramRequirementRow {
  id: string;
  program_id: string;
  requirement_type: ProgramRequirementType;
  label: string;
  value_text: string | null;
  value_num: number | null;
  operator: string | null;
  is_required: boolean | null;
  source_url: string | null;
  last_verified_at: string | null;
}

interface CollegeRow {
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
  source_last_scraped_at: string | null;
}

type CollegeProgramUpsertInput = {
  id?: string;
  collegeId: string;
  programName: string;
  programSlug?: string;
  degreeLevel?: DegreeLevel;
  modality?: ProgramModality;
  campusName?: string;
  departmentName?: string;
  programUrl?: string | null;
  admissionsUrl?: string | null;
  applicationDeadline?: string | null;
  startTerms?: string[];
  transferFriendly?: boolean;
  freshmanOpen?: boolean;
  internationalOpen?: boolean;
  requiresPortfolio?: boolean;
  requiresAudition?: boolean;
  requiresBackgroundCheck?: boolean;
  accreditation?: string | null;
  extractionStatus?: ProgramExtractionStatus;
  lastScrapedAt?: string | null;
  sourceMetadata?: Record<string, unknown> | null;
};

type ProgramRequirementUpsertInput = {
  id?: string;
  programId: string;
  requirementType: ProgramRequirementType;
  label: string;
  valueText?: string | null;
  valueNum?: number | null;
  operator?: string | null;
  isRequired?: boolean;
  sourceUrl?: string | null;
  lastVerifiedAt?: string | null;
};

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";
const PROGRAM_SELECT = `
  id,
  college_id,
  program_name,
  program_slug,
  degree_level,
  modality,
  campus_name,
  department_name,
  program_url,
  admissions_url,
  application_deadline,
  start_terms,
  transfer_friendly,
  freshman_open,
  international_open,
  requires_portfolio,
  requires_audition,
  requires_background_check,
  accreditation,
  extraction_status,
  last_scraped_at,
  source_metadata,
  colleges!inner(
    id,
    name,
    location,
    state,
    city,
    type,
    tuition_in_state,
    tuition_out_state,
    tuition_display,
    acceptance_rate_display,
    acceptance_rate_num,
    min_gpa,
    avg_gpa,
    ranking,
    enrollment_size,
    majors,
    tags,
    sat_range,
    act_range,
    financial_aid_percent,
    avg_aid_amount,
    graduation_rate,
    description,
    website,
    region,
    source_last_scraped_at
  ),
  program_requirements(
    id,
    program_id,
    requirement_type,
    label,
    value_text,
    value_num,
    operator,
    is_required,
    source_url,
    last_verified_at
  )
`;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeStringArray(values: string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

function toCollegeEntry(row: CollegeRow): CollegeEntry {
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
    tuition:
      row.tuition_display?.trim() ||
      (tuitionOutState !== tuitionInState && tuitionOutState > 0
        ? `$${tuitionInState.toLocaleString()} (in-state) / $${tuitionOutState.toLocaleString()} (out-of-state)`
        : tuitionInState > 0
          ? `$${tuitionInState.toLocaleString()}`
          : "Contact school"),
    acceptanceRate:
      row.acceptance_rate_display?.trim() ||
      (acceptanceRateNum >= 0.999 ? "Open Enrollment" : `${Math.round(acceptanceRateNum * 100)}%`),
    acceptanceRateNum,
    minGPA: Number(row.min_gpa ?? 0),
    avgGPA: Number(row.avg_gpa ?? 0),
    ranking: row.ranking ?? 999999,
    enrollmentSize: row.enrollment_size ?? 0,
    majors: normalizeStringArray(row.majors),
    tags: normalizeStringArray(row.tags),
    satRange: row.sat_range?.trim() || "N/A",
    actRange: row.act_range?.trim() || "N/A",
    financialAidPercent: row.financial_aid_percent ?? 0,
    avgAidAmount: row.avg_aid_amount ?? 0,
    graduationRate: row.graduation_rate ?? 0,
    description: row.description?.trim() || "",
    website: row.website?.trim() || "",
    region: row.region?.trim() || "",
  };
}

function toProgramRequirement(row: ProgramRequirementRow): ProgramRequirement {
  return {
    id: row.id,
    programId: row.program_id,
    requirementType: row.requirement_type,
    label: row.label,
    valueText: row.value_text,
    valueNum: row.value_num,
    operator: row.operator,
    isRequired: row.is_required ?? true,
    sourceUrl: row.source_url,
    lastVerifiedAt: row.last_verified_at,
  };
}

function toCollegeProgram(row: ProgramRow): CollegeProgram {
  return {
    id: row.id,
    collegeId: row.college_id,
    programName: row.program_name,
    programSlug: row.program_slug,
    degreeLevel: row.degree_level,
    modality: row.modality,
    campusName: row.campus_name?.trim() || "",
    departmentName: row.department_name?.trim() || "",
    programUrl: row.program_url?.trim() || null,
    admissionsUrl: row.admissions_url?.trim() || null,
    applicationDeadline: row.application_deadline?.trim() || null,
    startTerms: normalizeStringArray(row.start_terms),
    transferFriendly: row.transfer_friendly ?? false,
    freshmanOpen: row.freshman_open ?? true,
    internationalOpen: row.international_open ?? true,
    requiresPortfolio: row.requires_portfolio ?? false,
    requiresAudition: row.requires_audition ?? false,
    requiresBackgroundCheck: row.requires_background_check ?? false,
    accreditation: row.accreditation?.trim() || null,
    extractionStatus: row.extraction_status ?? "pending",
    lastScrapedAt: row.last_scraped_at,
    sourceMetadata: row.source_metadata ?? null,
    requirements: (row.program_requirements ?? []).map(toProgramRequirement),
  };
}

function programInputToRow(input: CollegeProgramUpsertInput) {
  const degreeLevel = input.degreeLevel ?? "bachelor";
  const campusName = input.campusName?.trim() ?? "";
  const programSlug = input.programSlug?.trim() || slugify(input.programName);

  return {
    id: input.id?.trim() || `${input.collegeId}-${programSlug}-${degreeLevel}-${slugify(campusName || "main")}`,
    college_id: input.collegeId,
    program_name: input.programName.trim(),
    program_slug: programSlug,
    degree_level: degreeLevel,
    modality: input.modality ?? "any",
    campus_name: campusName,
    department_name: input.departmentName?.trim() || "",
    program_url: input.programUrl?.trim() || null,
    admissions_url: input.admissionsUrl?.trim() || null,
    application_deadline: input.applicationDeadline?.trim() || null,
    start_terms: normalizeStringArray(input.startTerms),
    transfer_friendly: input.transferFriendly ?? false,
    freshman_open: input.freshmanOpen ?? true,
    international_open: input.internationalOpen ?? true,
    requires_portfolio: input.requiresPortfolio ?? false,
    requires_audition: input.requiresAudition ?? false,
    requires_background_check: input.requiresBackgroundCheck ?? false,
    accreditation: input.accreditation?.trim() || null,
    extraction_status: input.extractionStatus ?? "pending",
    last_scraped_at: input.lastScrapedAt ?? null,
    source_metadata: input.sourceMetadata ?? null,
  };
}

function requirementInputToRow(input: ProgramRequirementUpsertInput) {
  return {
    id:
      input.id?.trim() ||
      `${input.programId}-${input.requirementType}-${slugify(input.label || input.requirementType)}`,
    program_id: input.programId,
    requirement_type: input.requirementType,
    label: input.label.trim(),
    value_text: input.valueText?.trim() || null,
    value_num: input.valueNum ?? null,
    operator: input.operator?.trim() || null,
    is_required: input.isRequired ?? true,
    source_url: input.sourceUrl?.trim() || null,
    last_verified_at: input.lastVerifiedAt ?? null,
  };
}

function inferProgramDegreeLevel(college: CollegeEntry): DegreeLevel {
  if (college.type === "Community College") return "associate";
  if (college.type === "Technical College") return "certificate";
  return "bachelor";
}

function buildStaticProgramMetadata(college: CollegeEntry, programName: string) {
  return {
    seed: {
      source: "collegeDatabase",
      derivedFromMajor: programName,
      seededAt: new Date().toISOString(),
    },
  };
}

function buildStaticProgramRequirements(
  programId: string,
  college: CollegeEntry,
  degreeLevel: DegreeLevel
): ProgramRequirementUpsertInput[] {
  const requirements: ProgramRequirementUpsertInput[] = [];

  if (college.minGPA > 0) {
    requirements.push({
      programId,
      requirementType: "min_gpa",
      label: "Minimum GPA",
      valueNum: Number(college.minGPA.toFixed(2)),
      operator: ">=",
      isRequired: true,
      sourceUrl: college.website || null,
      lastVerifiedAt: null,
    });
  }

  requirements.push({
    programId,
    requirementType: "note",
    label: "Entry pathway",
    valueText:
      degreeLevel === "associate"
        ? "Associate-level pathway. Contact the college for program-specific placement or course requirements."
        : "Bachelor-level pathway. Check the official admissions page for program-specific requirements.",
    isRequired: false,
    sourceUrl: college.website || null,
  });

  if (college.type === "Community College") {
    requirements.push({
      programId,
      requirementType: "application_item",
      label: "Open enrollment",
      valueText: "Community college entry is typically open enrollment, but some programs may have separate prerequisites.",
      isRequired: false,
      sourceUrl: college.website || null,
    });
  }

  return requirements;
}

export function deriveProgramsFromCollegeEntry(college: CollegeEntry): CollegeProgramUpsertInput[] {
  const degreeLevel = inferProgramDegreeLevel(college);
  const transferFriendly = college.tags.some((tag) => tag.toLowerCase().includes("transfer"));

  return normalizeStringArray(college.majors).map((programName) => ({
    collegeId: college.id,
    programName,
    degreeLevel,
    modality: "any",
    campusName: college.city,
    programUrl: college.website || null,
    admissionsUrl: college.website || null,
    transferFriendly: transferFriendly || college.type === "Community College",
    freshmanOpen: true,
    internationalOpen: college.type !== "Community College",
    extractionStatus: "pending",
    sourceMetadata: buildStaticProgramMetadata(college, programName),
  }));
}

export async function upsertCollegePrograms(
  inputs: CollegeProgramUpsertInput[]
): Promise<CollegeProgram[]> {
  if (inputs.length === 0) return [];

  const rows = inputs.map(programInputToRow);
  const { data, error } = await supabaseServer
    .from("college_programs")
    .upsert(rows, {
      onConflict: "college_id,program_slug,degree_level,campus_name",
    })
    .select(PROGRAM_SELECT);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProgramRow[]).map(toCollegeProgram);
}

export async function upsertProgramRequirements(
  inputs: ProgramRequirementUpsertInput[]
): Promise<ProgramRequirement[]> {
  if (inputs.length === 0) return [];

  const rows = inputs.map(requirementInputToRow);
  const { data, error } = await supabaseServer
    .from("program_requirements")
    .upsert(rows, { onConflict: "program_id,requirement_type,label" })
    .select(
      "id, program_id, requirement_type, label, value_text, value_num, operator, is_required, source_url, last_verified_at"
    );

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProgramRequirementRow[]).map(toProgramRequirement);
}

export async function syncCollegeProgramsFromColleges(colleges: CollegeEntry[]) {
  const programInputs = colleges.flatMap(deriveProgramsFromCollegeEntry);
  const programs = await upsertCollegePrograms(programInputs);

  const requirementInputs = programs.flatMap((program) => {
    const college = colleges.find((entry) => entry.id === program.collegeId);
    return college ? buildStaticProgramRequirements(program.id, college, program.degreeLevel) : [];
  });

  const requirements = await upsertProgramRequirements(requirementInputs);

  return {
    programs,
    requirements,
  };
}

export async function ensureStaticProgramCatalogSeeded(): Promise<"database" | "static"> {
  const { count, error } = await supabaseServer
    .from("college_programs")
    .select("id", { count: "exact", head: true });

  if (error) {
    return "static";
  }

  if ((count ?? 0) > 0) {
    return "database";
  }

  try {
    await syncCollegeProgramsFromColleges(collegeDatabase);
    return "database";
  } catch (seedError) {
    console.error("Failed to seed static college programs:", seedError);
    return "static";
  }
}

export async function getCollegeProgramById(programId: string): Promise<{
  college: CollegeEntry;
  program: CollegeProgram;
} | null> {
  const { data, error } = await supabaseServer
    .from("college_programs")
    .select(PROGRAM_SELECT)
    .eq("id", programId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ProgramRow;
  if (!row.colleges) return null;

  return {
    college: toCollegeEntry(row.colleges),
    program: toCollegeProgram(row),
  };
}

export async function listCollegeProgramsWithDetails(options: {
  state?: string;
  studentType?: "freshman" | "transfer";
  limit?: number;
} = {}): Promise<Array<{ college: CollegeEntry; program: CollegeProgram }>> {
  let request = supabaseServer.from("college_programs").select(PROGRAM_SELECT);

  if (options.state) {
    request = request.eq("colleges.state", options.state.trim().toUpperCase());
  }

  if (options.studentType === "freshman") {
    request = request.eq("freshman_open", true);
  } else if (options.studentType === "transfer") {
    request = request.eq("transfer_friendly", true);
  }

  const { data, error } = await request.limit(options.limit ?? 200);
  if (error) {
    throw error;
  }

  return ((data ?? []) as ProgramRow[])
    .filter((row) => Boolean(row.colleges))
    .map((row) => ({
      college: toCollegeEntry(row.colleges as CollegeRow),
      program: toCollegeProgram(row),
    }));
}

function extractDeadline(markdown: string): string | null {
  const match = markdown.match(
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,\s+\d{4})?/i
  );
  return match?.[0]?.trim() || null;
}

function extractMinGpa(markdown: string): number | null {
  const match = markdown.match(/\b(?:minimum|min\.?)\s+gpa(?:\s+of)?\s*[:\-]?\s*([0-4](?:\.\d{1,2})?)\b/i);
  if (!match) return null;

  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
}

function summarizeRelevantMarkdown(markdown: string, programName: string): string {
  const lines = markdown
    .split(/\n+/)
    .map((line) => line.replace(/[#>*`-]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 40 && line.length <= 220);

  const keywords = [
    programName.toLowerCase(),
    "admission",
    "deadline",
    "apply",
    "requirement",
    "transfer",
    "first-year",
    "freshman",
  ];

  const scored = lines
    .map((line) => ({
      line,
      score: keywords.reduce((score, keyword) => score + (line.toLowerCase().includes(keyword) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scored.slice(0, 2).map((entry) => entry.line).join(" ").slice(0, 420);
}

function mergeSourceMetadata(
  current: Record<string, unknown> | null,
  updates: Record<string, unknown>
): Record<string, unknown> {
  return {
    ...(current ?? {}),
    ...updates,
  };
}

function buildRequirementInputsFromMarkdown(
  program: CollegeProgram,
  college: CollegeEntry,
  markdown: string,
  sourceUrl: string
): ProgramRequirementUpsertInput[] {
  const nextRequirements: ProgramRequirementUpsertInput[] = [];
  const minGpa = extractMinGpa(markdown);

  if (minGpa !== null) {
    nextRequirements.push({
      programId: program.id,
      requirementType: "min_gpa",
      label: "Minimum GPA",
      valueNum: minGpa,
      operator: ">=",
      isRequired: true,
      sourceUrl,
      lastVerifiedAt: new Date().toISOString(),
    });
  }

  const lower = markdown.toLowerCase();

  if (/\bportfolio\b/.test(lower)) {
    nextRequirements.push({
      programId: program.id,
      requirementType: "application_item",
      label: "Portfolio required",
      valueText: "Official page mentions a portfolio requirement.",
      isRequired: true,
      sourceUrl,
      lastVerifiedAt: new Date().toISOString(),
    });
  }

  if (/\baudition\b/.test(lower)) {
    nextRequirements.push({
      programId: program.id,
      requirementType: "application_item",
      label: "Audition required",
      valueText: "Official page mentions an audition requirement.",
      isRequired: true,
      sourceUrl,
      lastVerifiedAt: new Date().toISOString(),
    });
  }

  if (/\btransfer\b/.test(lower) && !program.transferFriendly) {
    nextRequirements.push({
      programId: program.id,
      requirementType: "note",
      label: "Transfer pathway",
      valueText: `Official page for ${program.programName} references transfer-specific information.`,
      isRequired: false,
      sourceUrl,
      lastVerifiedAt: new Date().toISOString(),
    });
  }

  if (nextRequirements.length === 0) {
    nextRequirements.push({
      programId: program.id,
      requirementType: "note",
      label: "Official site review",
      valueText:
        summarizeRelevantMarkdown(markdown, program.programName) ||
        `Official ${college.name} content was reviewed for ${program.programName}.`,
      isRequired: false,
      sourceUrl,
      lastVerifiedAt: new Date().toISOString(),
    });
  }

  return nextRequirements;
}

async function updateProgramExtractionStatus(programId: string, extractionStatus: ProgramExtractionStatus) {
  await supabaseServer
    .from("college_programs")
    .update({ extraction_status: extractionStatus, last_scraped_at: new Date().toISOString() })
    .eq("id", programId);
}

export async function enrichCollegeProgramById(programId: string): Promise<boolean> {
  const details = await getCollegeProgramById(programId);
  if (!details) return false;

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return false;

  const { program, college } = details;
  const targetUrl = program.programUrl || program.admissionsUrl || college.website;
  if (!targetUrl) return false;

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 25000,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as {
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

    if (!response.ok || !payload.success || !payload.data) {
      await updateProgramExtractionStatus(program.id, "failed");
      return false;
    }

    const metadata = payload.data.metadata ?? {};
    const markdown = payload.data.markdown?.trim() ?? "";
    const sourceUrl = metadata.sourceURL?.trim() || metadata.url?.trim() || targetUrl;
    const summary = summarizeRelevantMarkdown(markdown, program.programName);
    const deadline = extractDeadline(markdown);
    const lower = markdown.toLowerCase();

    const { error: updateError } = await supabaseServer
      .from("college_programs")
      .update({
        program_url: program.programUrl || sourceUrl,
        admissions_url: program.admissionsUrl || sourceUrl,
        application_deadline: deadline || program.applicationDeadline,
        transfer_friendly: program.transferFriendly || /\btransfer\b/.test(lower),
        freshman_open: program.freshmanOpen || /\bfreshman\b|\bfirst-year\b/.test(lower),
        requires_portfolio: program.requiresPortfolio || /\bportfolio\b/.test(lower),
        requires_audition: program.requiresAudition || /\baudition\b/.test(lower),
        requires_background_check:
          program.requiresBackgroundCheck || /\bbackground check\b/.test(lower),
        extraction_status: summary ? "complete" : "partial",
        last_scraped_at: new Date().toISOString(),
        source_metadata: mergeSourceMetadata(program.sourceMetadata, {
          firecrawl: {
            title: metadata.title?.trim() || null,
            description: metadata.description?.trim() || null,
            sourceUrl,
            summary,
          },
        }),
      })
      .eq("id", program.id);

    if (updateError) {
      console.error(`Failed to update college program ${program.id}:`, updateError);
      return false;
    }

    const requirementInputs = buildRequirementInputsFromMarkdown(program, college, markdown, sourceUrl);
    await upsertProgramRequirements(requirementInputs);

    return true;
  } catch (error) {
    console.error(`Failed to enrich program ${program.id}:`, error);
    await updateProgramExtractionStatus(program.id, "failed");
    return false;
  }
}

function programNeedsRefresh(result: CollegeMatchResult): boolean {
  const { program, freshness } = result;
  return (
    freshness.status !== "fresh" ||
    program.extractionStatus !== "complete" ||
    !program.programUrl ||
    !program.admissionsUrl
  );
}

export async function refreshTopProgramMatches(results: CollegeMatchResult[], limit = 5) {
  const queuedProgramIds = results
    .filter(programNeedsRefresh)
    .slice(0, Math.max(1, limit))
    .map((result) => result.program.id);

  if (queuedProgramIds.length === 0) {
    return queuedProgramIds;
  }

  void Promise.allSettled(queuedProgramIds.map((programId) => enrichCollegeProgramById(programId)));
  return queuedProgramIds;
}

export async function refreshStaleProgramData(limit = 10): Promise<number> {
  const { data, error } = await supabaseServer
    .from("college_programs")
    .select(PROGRAM_SELECT)
    .or("last_scraped_at.is.null,extraction_status.neq.complete")
    .limit(limit);

  if (error) {
    console.error("Failed to load stale college programs:", error);
    return 0;
  }

  const rows = (data ?? []) as ProgramRow[];
  await Promise.allSettled(rows.map((row) => enrichCollegeProgramById(row.id)));
  return rows.length;
}
