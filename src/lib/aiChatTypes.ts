import type { UserProfile } from "./aiEngine";
import type { CollegeEntry } from "./collegeDatabase";

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
  profileUpdates?: Partial<UserProfile>;
  followUpQuestions?: string[];
  sources?: AIChatSource[];
}
