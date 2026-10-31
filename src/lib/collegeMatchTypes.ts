import type { CollegeEntry } from "./collegeDatabase";

export type StudentType = "freshman" | "transfer";
export type DegreeLevel = "certificate" | "associate" | "bachelor";
export type ProgramModality = "in_person" | "online" | "hybrid" | "any";
export type BudgetLevel = "low" | "medium" | "high";
export type FitBucket = "strong_fit" | "likely_fit" | "possible_fit" | "unknown";
export type ProgramExtractionStatus = "pending" | "partial" | "complete" | "failed";
export type ProgramRequirementType =
  | "min_gpa"
  | "prereq_course"
  | "test_policy"
  | "english"
  | "residency"
  | "application_item"
  | "note";

export interface StudentMatchProfile {
  userId?: string;
  studentType?: StudentType;
  residencyState?: string | null;
  targetStates?: string[];
  zipCode?: string | null;
  maxDistanceMiles?: number | null;
  intendedProgram?: string | null;
  programKeywords?: string[];
  degreeLevel?: DegreeLevel;
  modality?: ProgramModality;
  startTerm?: string | null;
  gpa?: number | null;
  budgetLevel?: BudgetLevel | null;
  maxAnnualTuition?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  currentCollegeName?: string | null;
  completedCollegeCredits?: number | null;
  hsCompleted?: boolean | null;
  englishProficiency?: string | null;
  needsFinancialAid?: boolean;
  isFirstGen?: boolean;
  supportNeeds?: string[];
  careerGoal?: string | null;
}

export interface ProgramRequirement {
  id: string;
  programId: string;
  requirementType: ProgramRequirementType;
  label: string;
  valueText: string | null;
  valueNum: number | null;
  operator: string | null;
  isRequired: boolean;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
}

export interface CollegeProgram {
  id: string;
  collegeId: string;
  programName: string;
  programSlug: string;
  degreeLevel: DegreeLevel;
  modality: ProgramModality;
  campusName: string;
  departmentName: string;
  programUrl: string | null;
  admissionsUrl: string | null;
  applicationDeadline: string | null;
  startTerms: string[];
  transferFriendly: boolean;
  freshmanOpen: boolean;
  internationalOpen: boolean;
  requiresPortfolio: boolean;
  requiresAudition: boolean;
  requiresBackgroundCheck: boolean;
  accreditation: string | null;
  extractionStatus: ProgramExtractionStatus;
  lastScrapedAt: string | null;
  sourceMetadata: Record<string, unknown> | null;
  requirements?: ProgramRequirement[];
}

export interface CollegeMatchResult {
  college: CollegeEntry;
  program: CollegeProgram;
  fitBucket: FitBucket;
  fitScore: number;
  whyFit: string[];
  blockers: string[];
  missingData: string[];
  nextSteps: string[];
  freshness: {
    source: "database" | "static";
    status: "fresh" | "stale" | "missing";
    lastScrapedAt: string | null;
  };
}

export interface CollegeMatchResponse {
  results: CollegeMatchResult[];
  missingFields: string[];
  enrichmentStatus: {
    mode: "hybrid_async";
    queuedProgramIds: string[];
  };
  source: "database" | "static";
  profile: StudentMatchProfile;
}
