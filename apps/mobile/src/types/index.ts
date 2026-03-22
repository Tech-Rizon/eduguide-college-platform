export type StudentType = "freshman" | "transfer";
export type CollegeSize = "small" | "medium" | "large";
export type CollegeType =
  | "public"
  | "private"
  | "liberal_arts"
  | "research"
  | "hbcu"
  | "community";
export type CampusEnvironment = "urban" | "suburban" | "rural";
export type FitBucket = "strong_fit" | "likely_fit" | "possible_fit" | "unknown";

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  studentType: StudentType;
  gpa: number;
  satScore?: number;
  actScore?: number;
  intendedMajor: string;
  intendedMajorLabel: string;
  budgetMax: number;
  stateResidence: string;
  preferredStates: string[];
  collegeSize: CollegeSize[];
  collegeType: CollegeType[];
  campusEnvironment: CampusEnvironment[];
  savedCollegeIds: string[];
  appliedCollegeIds: string[];
  onboardingComplete: boolean;
  createdAt: string;
}

export interface CollegeSummary {
  id: string;
  name: string;
  city: string;
  state: string;
  website: string;
  description?: string;
  type: CollegeType;
  tuitionInState?: number;
  tuitionOutOfState?: number;
  averageNetPrice?: number;
  ranking?: number | null;
  programName?: string;
  admissionsUrl?: string | null;
  applicationDeadline?: string | null;
  fitBucket?: FitBucket;
  fitScore?: number;
  whyFit?: string[];
  blockers?: string[];
}

export interface Scholarship {
  id: string;
  name: string;
  provider: string;
  amount: number;
  amountIsRecurring: boolean;
  deadline: string;
  description: string;
  url: string;
  minGpa?: number;
  majors?: string[];
  states?: string[];
  matchScore?: number;
}

export interface Deadline {
  id: string;
  collegeId: string;
  collegeName: string;
  type: "EA" | "ED" | "RD" | "Scholarship" | "FAFSA" | "Other";
  date: string;
  note?: string;
  notifyDaysBefore: number[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  suggestions?: string[];
  isStreaming?: boolean;
}

export interface AdvisorResponse {
  text: string;
  suggestions: string[];
  recommendedColleges?: CollegeSummary[];
}

export interface CollegeSearchParams {
  query?: string;
  state?: string;
  limit?: number;
  useMatchEndpoint?: boolean;
}

export interface ScholarshipSearchParams {
  major?: string;
  state?: string;
  gpa?: number;
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  ProfileSetup: undefined;
  Preferences: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  CollegesTab: undefined;
  AdvisorTab: undefined;
  ScholarshipsTab: undefined;
  ProfileTab: undefined;
};

export type CollegesStackParamList = {
  CollegeSearch: undefined;
  CollegeDetail: {
    collegeId: string;
    college?: CollegeSummary;
  };
};
