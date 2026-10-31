import type { StudentProfile } from "@types";
import { apiFetch, apiJson, getAccessToken } from "@services/apiClient";

type RemoteStudentMatchProfile = {
  studentType?: "freshman" | "transfer";
  residencyState?: string | null;
  targetStates?: string[];
  intendedProgram?: string | null;
  gpa?: number | null;
  budgetLevel?: "low" | "medium" | "high" | null;
  maxAnnualTuition?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  currentCollegeName?: string | null;
  completedCollegeCredits?: number | null;
  needsFinancialAid?: boolean;
  isFirstGen?: boolean;
  supportNeeds?: string[];
  careerGoal?: string | null;
  startTerm?: string | null;
  modality?: "in_person" | "online" | "hybrid" | "any";
  degreeLevel?: "certificate" | "associate" | "bachelor";
};

type MatchProfileResponse = {
  profile: RemoteStudentMatchProfile | null;
};

function slugifyProgram(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hasRemoteMatchData(profile: RemoteStudentMatchProfile | null) {
  if (!profile) return false;

  return Boolean(
    profile.intendedProgram ||
      profile.gpa !== null && profile.gpa !== undefined ||
      profile.residencyState ||
      profile.targetStates?.length ||
      profile.maxAnnualTuition !== null && profile.maxAnnualTuition !== undefined
  );
}

function deriveBudgetLevel(budgetMax: number) {
  if (budgetMax <= 20000) return "low";
  if (budgetMax <= 45000) return "medium";
  return "high";
}

function toRemoteMatchProfile(profile: StudentProfile): Partial<RemoteStudentMatchProfile> {
  const intendedProgram = profile.intendedMajorLabel.trim();
  const targetStates = profile.preferredStates.filter(Boolean);
  const residencyState = profile.stateResidence.trim().toUpperCase();

  const payload: Partial<RemoteStudentMatchProfile> = {};

  if (profile.onboardingComplete || profile.studentType !== "freshman") {
    payload.studentType = profile.studentType;
  }

  if (residencyState) {
    payload.residencyState = residencyState;
  }

  if (targetStates.length) {
    payload.targetStates = targetStates;
  }

  if (intendedProgram) {
    payload.intendedProgram = intendedProgram;
  }

  if (profile.onboardingComplete || profile.gpa !== 3.4) {
    payload.gpa = profile.gpa;
  }

  if (profile.onboardingComplete || profile.budgetMax !== 35000) {
    payload.maxAnnualTuition = profile.budgetMax;
    payload.budgetLevel = deriveBudgetLevel(profile.budgetMax);
  }

  if (typeof profile.satScore === "number") {
    payload.satScore = profile.satScore;
  }

  if (typeof profile.actScore === "number") {
    payload.actScore = profile.actScore;
  }

  return payload;
}

export function applyRemoteMatchProfile(
  profile: StudentProfile,
  remoteProfile: RemoteStudentMatchProfile | null
): StudentProfile {
  if (!remoteProfile) return profile;

  const intendedProgram = remoteProfile.intendedProgram?.trim() || profile.intendedMajorLabel;

  return {
    ...profile,
    studentType: remoteProfile.studentType ?? profile.studentType,
    stateResidence: remoteProfile.residencyState?.trim().toUpperCase() || profile.stateResidence,
    preferredStates: remoteProfile.targetStates?.length ? remoteProfile.targetStates : profile.preferredStates,
    intendedMajorLabel: intendedProgram,
    intendedMajor: intendedProgram ? slugifyProgram(intendedProgram) : profile.intendedMajor,
    gpa:
      typeof remoteProfile.gpa === "number" && Number.isFinite(remoteProfile.gpa)
        ? remoteProfile.gpa
        : profile.gpa,
    budgetMax:
      typeof remoteProfile.maxAnnualTuition === "number" && Number.isFinite(remoteProfile.maxAnnualTuition)
        ? remoteProfile.maxAnnualTuition
        : profile.budgetMax,
    satScore:
      typeof remoteProfile.satScore === "number" && Number.isFinite(remoteProfile.satScore)
        ? remoteProfile.satScore
        : profile.satScore,
    actScore:
      typeof remoteProfile.actScore === "number" && Number.isFinite(remoteProfile.actScore)
        ? remoteProfile.actScore
        : profile.actScore,
    onboardingComplete: profile.onboardingComplete || hasRemoteMatchData(remoteProfile)
  };
}

export async function fetchRemoteMatchProfile(): Promise<RemoteStudentMatchProfile | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await apiFetch("/api/match-profile", { method: "GET" });
  if (response.status === 401) return null;

  const payload = (await response.json().catch(() => null)) as MatchProfileResponse | { error?: string } | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Failed to load match profile.";
    throw new Error(message);
  }

  return (payload as MatchProfileResponse | null)?.profile ?? null;
}

export async function saveRemoteMatchProfile(
  profile: StudentProfile
): Promise<RemoteStudentMatchProfile | null> {
  const token = await getAccessToken();
  if (!token) return null;

  return apiJson<MatchProfileResponse>("/api/match-profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toRemoteMatchProfile(profile))
  }).then((payload) => payload.profile ?? null);
}
