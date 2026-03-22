import type { UserProfile } from "./aiEngine";
import { collegeDatabase, type CollegeEntry } from "./collegeDatabase";
import {
  deriveProgramsFromCollegeEntry,
  ensureStaticProgramCatalogSeeded,
  listCollegeProgramsWithDetails,
  refreshTopProgramMatches,
} from "./collegeProgramCatalogServer";
import type {
  BudgetLevel,
  CollegeMatchResponse,
  CollegeMatchResult,
  CollegeProgram,
  DegreeLevel,
  FitBucket,
  ProgramModality,
  ProgramRequirement,
  StudentMatchProfile,
  StudentType,
} from "./collegeMatchTypes";
import { supabaseServer } from "./supabaseServer";

type StudentMatchProfileRow = {
  user_id: string;
  student_type: StudentType | null;
  residency_state: string | null;
  target_states: string[] | null;
  zip_code: string | null;
  max_distance_miles: number | null;
  intended_program: string | null;
  program_keywords: string[] | null;
  degree_level: DegreeLevel | null;
  modality: ProgramModality | null;
  start_term: string | null;
  gpa: number | null;
  budget_level: BudgetLevel | null;
  max_annual_tuition: number | null;
  sat_score: number | null;
  act_score: number | null;
  current_college_name: string | null;
  completed_college_credits: number | null;
  hs_completed: boolean | null;
  english_proficiency: string | null;
  needs_financial_aid: boolean | null;
  is_first_gen: boolean | null;
  support_needs: string[] | null;
  career_goal: string | null;
};

type MatchCandidate = {
  college: CollegeEntry;
  program: CollegeProgram;
};

const STUDENT_TYPES: StudentType[] = ["freshman", "transfer"];
const DEGREE_LEVELS: DegreeLevel[] = ["certificate", "associate", "bachelor"];
const MODALITIES: ProgramModality[] = ["in_person", "online", "hybrid", "any"];
const BUDGET_LEVELS: BudgetLevel[] = ["low", "medium", "high"];
const STALE_PROGRAM_AGE_MS = 1000 * 60 * 60 * 24 * 14;

const STATE_MAP: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  dc: "DC",
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeState(value: unknown): string | null {
  const normalized = normalizeString(value);
  if (!normalized) return null;

  const lowered = normalized.toLowerCase();
  if (STATE_MAP[lowered]) return STATE_MAP[lowered];
  if (/^[A-Za-z]{2}$/.test(normalized)) return normalized.toUpperCase();
  return null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOptionalInt(value: unknown): number | null {
  const parsed = normalizeOptionalNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeStudentType(value: unknown): StudentType | undefined {
  return STUDENT_TYPES.includes(value as StudentType) ? (value as StudentType) : undefined;
}

function normalizeDegreeLevel(value: unknown): DegreeLevel | undefined {
  return DEGREE_LEVELS.includes(value as DegreeLevel) ? (value as DegreeLevel) : undefined;
}

function normalizeModality(value: unknown): ProgramModality | undefined {
  return MODALITIES.includes(value as ProgramModality) ? (value as ProgramModality) : undefined;
}

function normalizeBudgetLevel(value: unknown): BudgetLevel | undefined {
  return BUDGET_LEVELS.includes(value as BudgetLevel) ? (value as BudgetLevel) : undefined;
}

function rowToProfile(row: StudentMatchProfileRow): StudentMatchProfile {
  return {
    userId: row.user_id,
    studentType: row.student_type ?? undefined,
    residencyState: row.residency_state,
    targetStates: normalizeStringArray(row.target_states),
    zipCode: row.zip_code,
    maxDistanceMiles: row.max_distance_miles,
    intendedProgram: row.intended_program,
    programKeywords: normalizeStringArray(row.program_keywords),
    degreeLevel: row.degree_level ?? "bachelor",
    modality: row.modality ?? "any",
    startTerm: row.start_term,
    gpa: row.gpa,
    budgetLevel: row.budget_level,
    maxAnnualTuition: row.max_annual_tuition,
    satScore: row.sat_score,
    actScore: row.act_score,
    currentCollegeName: row.current_college_name,
    completedCollegeCredits: row.completed_college_credits,
    hsCompleted: row.hs_completed,
    englishProficiency: row.english_proficiency,
    needsFinancialAid: row.needs_financial_aid ?? false,
    isFirstGen: row.is_first_gen ?? false,
    supportNeeds: normalizeStringArray(row.support_needs),
    careerGoal: row.career_goal,
  };
}

function profileToRow(userId: string, profile: StudentMatchProfile) {
  return {
    user_id: userId,
    student_type: profile.studentType ?? "freshman",
    residency_state: profile.residencyState ?? null,
    target_states: normalizeStringArray(profile.targetStates),
    zip_code: profile.zipCode ?? null,
    max_distance_miles: profile.maxDistanceMiles ?? null,
    intended_program: profile.intendedProgram ?? null,
    program_keywords: normalizeStringArray(profile.programKeywords),
    degree_level: profile.degreeLevel ?? "bachelor",
    modality: profile.modality ?? "any",
    start_term: profile.startTerm ?? null,
    gpa: profile.gpa ?? null,
    budget_level: profile.budgetLevel ?? null,
    max_annual_tuition: profile.maxAnnualTuition ?? null,
    sat_score: profile.satScore ?? null,
    act_score: profile.actScore ?? null,
    current_college_name: profile.currentCollegeName ?? null,
    completed_college_credits: profile.completedCollegeCredits ?? null,
    hs_completed: profile.hsCompleted ?? null,
    english_proficiency: profile.englishProficiency ?? null,
    needs_financial_aid: profile.needsFinancialAid ?? false,
    is_first_gen: profile.isFirstGen ?? false,
    support_needs: normalizeStringArray(profile.supportNeeds),
    career_goal: profile.careerGoal ?? null,
  };
}

export function normalizeStudentMatchProfile(input: Partial<StudentMatchProfile> = {}): StudentMatchProfile {
  const intendedProgram = normalizeString(input.intendedProgram);
  return {
    userId: normalizeString(input.userId ?? null) ?? undefined,
    studentType: normalizeStudentType(input.studentType),
    residencyState: normalizeState(input.residencyState),
    targetStates: normalizeStringArray(input.targetStates).map((value) => normalizeState(value) || value),
    zipCode: normalizeString(input.zipCode),
    maxDistanceMiles: normalizeOptionalInt(input.maxDistanceMiles),
    intendedProgram,
    programKeywords: intendedProgram
      ? Array.from(new Set([intendedProgram, ...normalizeStringArray(input.programKeywords)]))
      : normalizeStringArray(input.programKeywords),
    degreeLevel: normalizeDegreeLevel(input.degreeLevel) ?? "bachelor",
    modality: normalizeModality(input.modality) ?? "any",
    startTerm: normalizeString(input.startTerm),
    gpa: normalizeOptionalNumber(input.gpa),
    budgetLevel: normalizeBudgetLevel(input.budgetLevel),
    maxAnnualTuition: normalizeOptionalInt(input.maxAnnualTuition),
    satScore: normalizeOptionalInt(input.satScore),
    actScore: normalizeOptionalInt(input.actScore),
    currentCollegeName: normalizeString(input.currentCollegeName),
    completedCollegeCredits: normalizeOptionalInt(input.completedCollegeCredits),
    hsCompleted:
      typeof input.hsCompleted === "boolean" ? input.hsCompleted : input.hsCompleted === null ? null : null,
    englishProficiency: normalizeString(input.englishProficiency),
    needsFinancialAid: normalizeBoolean(input.needsFinancialAid, false),
    isFirstGen: normalizeBoolean(input.isFirstGen, false),
    supportNeeds: normalizeStringArray(input.supportNeeds),
    careerGoal: normalizeString(input.careerGoal),
  };
}

export async function getStudentMatchProfile(userId: string): Promise<StudentMatchProfile | null> {
  const { data, error } = await supabaseServer
    .from("student_match_profiles")
    .select(
      "user_id, student_type, residency_state, target_states, zip_code, max_distance_miles, intended_program, program_keywords, degree_level, modality, start_term, gpa, budget_level, max_annual_tuition, sat_score, act_score, current_college_name, completed_college_credits, hs_completed, english_proficiency, needs_financial_aid, is_first_gen, support_needs, career_goal"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "PGRST116") return null;
    throw error;
  }

  return data ? rowToProfile(data as StudentMatchProfileRow) : null;
}

export async function upsertStudentMatchProfile(
  userId: string,
  input: Partial<StudentMatchProfile>
): Promise<StudentMatchProfile> {
  const profile = normalizeStudentMatchProfile({ ...input, userId });
  const { data, error } = await supabaseServer
    .from("student_match_profiles")
    .upsert(profileToRow(userId, profile), { onConflict: "user_id" })
    .select(
      "user_id, student_type, residency_state, target_states, zip_code, max_distance_miles, intended_program, program_keywords, degree_level, modality, start_term, gpa, budget_level, max_annual_tuition, sat_score, act_score, current_college_name, completed_college_credits, hs_completed, english_proficiency, needs_financial_aid, is_first_gen, support_needs, career_goal"
    )
    .single();

  if (error) throw error;

  return rowToProfile(data as StudentMatchProfileRow);
}

export function studentMatchProfileFromUserProfile(profile: UserProfile): StudentMatchProfile {
  return normalizeStudentMatchProfile({
    studentType: profile.studentType || (profile.isTransferStudent ? "transfer" : undefined),
    residencyState: profile.state,
    targetStates: profile.preferredStates?.length ? profile.preferredStates : profile.state ? [profile.state] : [],
    zipCode: profile.zipCode,
    intendedProgram: profile.intendedMajor,
    programKeywords: profile.intendedMajor ? [profile.intendedMajor] : [],
    gpa: profile.gpa,
    budgetLevel: profile.budget,
    maxAnnualTuition: profile.maxAnnualTuition,
    satScore: profile.satScore,
    actScore: profile.actScore,
    currentCollegeName: profile.currentCollegeName,
    completedCollegeCredits: profile.completedCollegeCredits,
    hsCompleted: profile.hsCompleted,
    needsFinancialAid: profile.needsFinancialAid,
    isFirstGen: profile.isFirstGen,
    modality: profile.modality,
    degreeLevel: profile.degreeLevel,
    startTerm: profile.startTerm,
    supportNeeds: profile.supportNeeds,
    careerGoal: profile.careerGoals,
  });
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseProfileOverridesFromQuery(query: string): Partial<StudentMatchProfile> {
  const lowered = query.toLowerCase();

  return normalizeStudentMatchProfile({
    studentType: /\btransfer\b/.test(lowered) ? "transfer" : /\bfreshman\b|\bfirst year\b|\bfirst-year\b/.test(lowered) ? "freshman" : undefined,
    residencyState:
      Object.entries(STATE_MAP).find(([name, code]) => lowered.includes(name) || lowered.includes(code.toLowerCase()))?.[1] ??
      undefined,
    budgetLevel:
      /\b(cheap|affordable|budget|low cost|financial aid|aid)\b/.test(lowered)
        ? "low"
        : /\b(expensive|elite|private)\b/.test(lowered)
          ? "high"
          : undefined,
    modality:
      /\bonline\b/.test(lowered)
        ? "online"
        : /\bhybrid\b/.test(lowered)
          ? "hybrid"
          : /\bin person\b|\bon-campus\b/.test(lowered)
            ? "in_person"
            : undefined,
  });
}

function mergeProfiles(...profiles: Array<Partial<StudentMatchProfile> | null | undefined>): StudentMatchProfile {
  const merged = profiles
    .filter((profile): profile is Partial<StudentMatchProfile> => Boolean(profile))
    .reduce<Partial<StudentMatchProfile>>(
      (current, profile) => ({
        ...current,
        ...profile,
        targetStates: profile.targetStates ?? current.targetStates,
        programKeywords: profile.programKeywords ?? current.programKeywords,
        supportNeeds: profile.supportNeeds ?? current.supportNeeds,
      }),
      {}
    );

  return normalizeStudentMatchProfile(merged);
}

function buildStaticCandidates(profile: StudentMatchProfile): MatchCandidate[] {
  return collegeDatabase.flatMap((college) =>
    deriveProgramsFromCollegeEntry(college).map((programInput) => {
      const programId =
        programInput.id ||
        `${programInput.collegeId}-${programInput.programSlug || tokenize(programInput.programName).join("-")}-${programInput.degreeLevel || "bachelor"}`;
      const requirements: ProgramRequirement[] =
        college.minGPA > 0
          ? [
              {
                id: `${programId}-min-gpa`,
                programId,
                requirementType: "min_gpa",
                label: "Minimum GPA",
                valueText: null,
                valueNum: college.minGPA,
                operator: ">=",
                isRequired: true,
                sourceUrl: college.website,
                lastVerifiedAt: null,
              },
            ]
          : [];

      return {
        college,
        program: {
          id: programId,
          collegeId: college.id,
          programName: programInput.programName,
          programSlug:
            programInput.programSlug ||
            tokenize(programInput.programName).join("-") ||
            programInput.programName.toLowerCase(),
          degreeLevel: programInput.degreeLevel || "bachelor",
          modality: programInput.modality || "any",
          campusName: programInput.campusName || college.city,
          departmentName: programInput.departmentName || "",
          programUrl: college.website || null,
          admissionsUrl: college.website || null,
          applicationDeadline: null,
          startTerms: [],
          transferFriendly: programInput.transferFriendly ?? false,
          freshmanOpen: programInput.freshmanOpen ?? true,
          internationalOpen: programInput.internationalOpen ?? true,
          requiresPortfolio: false,
          requiresAudition: false,
          requiresBackgroundCheck: false,
          accreditation: null,
          extractionStatus: "pending",
          lastScrapedAt: null,
          sourceMetadata: programInput.sourceMetadata ?? null,
          requirements,
        },
      };
    })
  );
}

function getProgramSearchTerm(profile: StudentMatchProfile, query: string): string {
  return profile.intendedProgram?.trim() || query.trim();
}

function computeProgramMatch(programName: string, programSearch: string): number {
  if (!programSearch) return 45;

  const programLower = programName.toLowerCase();
  const searchLower = programSearch.toLowerCase();
  if (programLower === searchLower) return 100;
  if (programLower.includes(searchLower) || searchLower.includes(programLower)) return 90;

  const programTokens = new Set(tokenize(programName));
  const queryTokens = tokenize(programSearch);
  if (queryTokens.length === 0) return 45;

  const overlap = queryTokens.filter((token) => programTokens.has(token)).length;
  return clamp(Math.round((overlap / queryTokens.length) * 100), 0, 100);
}

function evaluateRequirements(
  requirements: ProgramRequirement[],
  profile: StudentMatchProfile,
  program: CollegeProgram
): { blockers: string[]; missingData: string[]; score: number; whyFit: string[] } {
  const blockers: string[] = [];
  const missingData = new Set<string>();
  const whyFit: string[] = [];

  for (const requirement of requirements) {
    if (requirement.requirementType === "min_gpa" && requirement.valueNum !== null) {
      if (profile.gpa === null || profile.gpa === undefined) {
        missingData.add("GPA");
        continue;
      }

      if (profile.gpa < requirement.valueNum) {
        blockers.push(`Requires at least a ${requirement.valueNum.toFixed(2)} GPA.`);
      } else {
        whyFit.push(`Your GPA clears the listed ${requirement.valueNum.toFixed(2)} minimum.`);
      }
    }

    if (
      requirement.requirementType === "application_item" &&
      requirement.isRequired &&
      requirement.label
    ) {
      whyFit.push(requirement.label);
    }
  }

  if (profile.studentType === "transfer" && !program.transferFriendly) {
    blockers.push("Transfer pathway is not clearly supported for this program yet.");
  }

  if (profile.studentType === "freshman" && !program.freshmanOpen) {
    blockers.push("Freshman entry is not clearly open for this program yet.");
  }

  if (program.extractionStatus !== "complete") {
    missingData.add("official program requirements");
  }

  const score =
    blockers.length > 0 ? 25 : missingData.size > 0 ? 70 : 100;

  return {
    blockers,
    missingData: Array.from(missingData),
    score,
    whyFit,
  };
}

function computeLocationScore(profile: StudentMatchProfile, college: CollegeEntry): number {
  const stateTargets = normalizeStringArray(profile.targetStates);
  const targetState = stateTargets[0] || profile.residencyState;
  if (!targetState) return 60;
  return college.state === targetState ? 100 : 35;
}

function computeBudgetScore(profile: StudentMatchProfile, college: CollegeEntry): number {
  const tuition =
    profile.residencyState && college.state === profile.residencyState
      ? college.tuitionInState
      : college.tuitionOutState || college.tuitionInState;

  const cap =
    profile.maxAnnualTuition ??
    (profile.budgetLevel === "low" ? 15000 : profile.budgetLevel === "medium" ? 35000 : profile.budgetLevel === "high" ? 70000 : null);

  if (!cap) return 60;
  if (tuition <= cap) return 100;
  if (tuition <= cap * 1.25) return 65;
  return 20;
}

function computeSupportScore(profile: StudentMatchProfile, college: CollegeEntry, program: CollegeProgram): number {
  const tokens = [
    ...tokenize(profile.careerGoal || ""),
    ...normalizeStringArray(profile.supportNeeds).flatMap((value) => tokenize(value)),
    ...(profile.needsFinancialAid ? ["aid", "scholarship", "financial"] : []),
  ];

  if (tokens.length === 0) return 50;

  const haystack = `${college.description} ${college.tags.join(" ")} ${program.programName}`.toLowerCase();
  const overlap = tokens.filter((token) => haystack.includes(token)).length;
  return clamp(40 + overlap * 15, 40, 100);
}

function computeFreshness(program: CollegeProgram, college: CollegeEntry): CollegeMatchResult["freshness"] {
  const timestamp = program.lastScrapedAt || null;
  if (!timestamp) {
    return {
      source: "database",
      status: "missing",
      lastScrapedAt: null,
    };
  }

  const age = Date.now() - new Date(timestamp).getTime();
  return {
    source: "database",
    status: age <= STALE_PROGRAM_AGE_MS && program.extractionStatus === "complete" ? "fresh" : "stale",
    lastScrapedAt: timestamp,
  };
}

function buildNextSteps(
  fitBucket: FitBucket,
  profile: StudentMatchProfile,
  blockers: string[],
  program: CollegeProgram
): string[] {
  const nextSteps = [
    program.admissionsUrl ? "Open the official admissions page." : "Review the official program page.",
    profile.studentType === "transfer"
      ? "Check transfer-specific deadlines and credit policies."
      : "Review freshman application requirements and deadlines.",
    "Save this school to My Plan if it stays on your shortlist.",
  ];

  if (fitBucket === "possible_fit" || blockers.length > 0) {
    nextSteps[1] = "Confirm the listed blockers and missing prerequisites before applying.";
  }

  if (fitBucket === "unknown") {
    nextSteps[0] = "Refresh official program details before making a decision.";
  }

  return nextSteps;
}

function determineFitBucket(score: number, blockers: string[], missingData: string[]): FitBucket {
  if (missingData.includes("official program requirements")) return "unknown";
  if (blockers.length > 0) return "possible_fit";
  if (score >= 80) return "strong_fit";
  if (score >= 65) return "likely_fit";
  return "possible_fit";
}

function buildWhyFit(
  programScore: number,
  eligibilityWhyFit: string[],
  profile: StudentMatchProfile,
  college: CollegeEntry,
  program: CollegeProgram
): string[] {
  const whyFit = [...eligibilityWhyFit];

  if (programScore >= 80) {
    whyFit.push(`${program.programName} directly matches your stated program interest.`);
  }

  if (profile.residencyState && college.state === profile.residencyState) {
    whyFit.push(`This keeps you in ${profile.residencyState} for in-state options.`);
  }

  if (profile.budgetLevel === "low" && college.tuitionInState <= 15000) {
    whyFit.push("Tuition lines up with a lower-cost search.");
  }

  if (program.transferFriendly && profile.studentType === "transfer") {
    whyFit.push("The program is flagged as transfer-friendly.");
  }

  return Array.from(new Set(whyFit)).slice(0, 3);
}

function calculateMatchResult(
  candidate: MatchCandidate,
  profile: StudentMatchProfile,
  programSearch: string,
  source: "database" | "static"
): CollegeMatchResult {
  const { college, program } = candidate;
  const programScore = computeProgramMatch(program.programName, programSearch);
  const eligibility = evaluateRequirements(program.requirements ?? [], profile, program);
  const locationScore = computeLocationScore(profile, college);
  const budgetScore = computeBudgetScore(profile, college);
  const alignmentScore = profile.studentType === "transfer" ? (program.transferFriendly ? 100 : 20) : program.freshmanOpen ? 100 : 20;
  const supportScore = computeSupportScore(profile, college, program);

  const fitScore = Math.round(
    programScore * 0.3 +
      eligibility.score * 0.2 +
      locationScore * 0.15 +
      budgetScore * 0.15 +
      alignmentScore * 0.1 +
      supportScore * 0.1
  );

  const fitBucket = determineFitBucket(fitScore, eligibility.blockers, eligibility.missingData);

  return {
    college,
    program,
    fitBucket,
    fitScore,
    whyFit: buildWhyFit(programScore, eligibility.whyFit, profile, college, program),
    blockers: eligibility.blockers,
    missingData: eligibility.missingData,
    nextSteps: buildNextSteps(fitBucket, profile, eligibility.blockers, program),
    freshness:
      source === "static"
        ? { source: "static", status: "missing", lastScrapedAt: null }
        : computeFreshness(program, college),
  };
}

function getMissingFields(profile: StudentMatchProfile, query: string): string[] {
  const missing: string[] = [];
  if (!profile.studentType) missing.push("studentType");
  if (!profile.intendedProgram && !query.trim()) missing.push("intendedProgram");
  if (profile.gpa === null || profile.gpa === undefined) missing.push("gpa");
  if (!profile.residencyState && normalizeStringArray(profile.targetStates).length === 0) missing.push("state");
  if (!profile.budgetLevel && !profile.maxAnnualTuition) missing.push("budgetLevel");
  return missing;
}

export async function matchCollegePrograms(input: {
  storedProfile?: Partial<StudentMatchProfile> | null;
  profileOverrides?: Partial<StudentMatchProfile> | null;
  query?: string;
  limit?: number;
}): Promise<CollegeMatchResponse> {
  const query = input.query?.trim() ?? "";
  const profile = mergeProfiles(
    input.storedProfile,
    input.profileOverrides,
    parseProfileOverridesFromQuery(query)
  );
  const missingFields = getMissingFields(profile, query);
  const programSearch = getProgramSearchTerm(profile, query);
  const limit = Math.max(1, Math.min(input.limit ?? 5, 10));

  if (!programSearch || !profile.studentType) {
    return {
      results: [],
      missingFields,
      enrichmentStatus: {
        mode: "hybrid_async",
        queuedProgramIds: [],
      },
      source: "static",
      profile,
    };
  }

  const seededSource = await ensureStaticProgramCatalogSeeded();
  let candidates: MatchCandidate[] = [];
  let source: "database" | "static" = seededSource;

  if (seededSource === "database") {
    try {
      candidates = await listCollegeProgramsWithDetails({
        state: profile.targetStates?.[0] || profile.residencyState || undefined,
        studentType: profile.studentType,
        limit: 250,
      });
      source = "database";
    } catch (error) {
      console.error("Database program match query failed, falling back to static programs:", error);
      source = "static";
    }
  }

  if (source === "static") {
    candidates = buildStaticCandidates(profile);
  }

  const results = candidates
    .filter(({ college, program }) => {
      const programScore = computeProgramMatch(program.programName, programSearch);
      if (programScore < 45) return false;

      if (profile.modality && profile.modality !== "any" && program.modality !== "any" && program.modality !== profile.modality) {
        return false;
      }

      if (profile.degreeLevel && program.degreeLevel !== profile.degreeLevel) {
        return false;
      }

      if (profile.studentType === "transfer" && !program.transferFriendly) {
        return false;
      }

      if (profile.studentType === "freshman" && !program.freshmanOpen) {
        return false;
      }

      const preferredState = profile.targetStates?.[0] || profile.residencyState;
      if (preferredState && college.state !== preferredState) {
        const hasRemoteOption = program.modality === "online" || program.modality === "hybrid";
        if (!hasRemoteOption) return false;
      }

      return true;
    })
    .map((candidate) => calculateMatchResult(candidate, profile, programSearch, source))
    .sort((left, right) => right.fitScore - left.fitScore || left.college.ranking - right.college.ranking)
    .slice(0, limit);

  const queuedProgramIds =
    source === "database" && results.length > 0 ? await refreshTopProgramMatches(results, 5) : [];

  return {
    results,
    missingFields,
    enrichmentStatus: {
      mode: "hybrid_async",
      queuedProgramIds,
    },
    source,
    profile,
  };
}
