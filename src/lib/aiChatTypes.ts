import type { UserProfile } from "./aiEngine";
import type { CollegeEntry } from "./collegeDatabase";
import type { CollegeMatchResult } from "./collegeMatchTypes";

export interface AIChatSource {
  title: string;
  url: string;
  note: string;
}

export interface AIChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AIChatResponse {
  content: string;
  colleges?: CollegeEntry[];
  matchResults?: CollegeMatchResult[];
  profileUpdates?: Partial<UserProfile>;
  followUpQuestions?: string[];
  sources?: AIChatSource[];
}
