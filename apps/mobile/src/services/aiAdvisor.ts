import type { AdvisorResponse, ChatMessage, CollegeSummary, StudentProfile } from "@types";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== "false";

function mapRecommendedCollege(result: any): CollegeSummary {
  return {
    id: result.id ?? result.college?.id,
    name: result.name ?? result.college?.name,
    city: result.city ?? result.college?.city,
    state: result.state ?? result.college?.state,
    website: result.website ?? result.college?.website,
    description: result.description ?? result.college?.description,
    type: (result.type ?? result.college?.type ?? "public").replace(" ", "_"),
    fitScore: result.fitScore,
    fitBucket: result.fitBucket,
    programName: result.program?.programName,
    admissionsUrl: result.program?.admissionsUrl,
    whyFit: result.whyFit ?? [],
    blockers: result.blockers ?? []
  };
}

export function generateSuggestions(lastAssistantMessage: string): string[] {
  const message = lastAssistantMessage.toLowerCase();
  if (message.includes("scholarship") || message.includes("financial aid")) {
    return ["Show scholarships", "What aid should I apply for?", "How does FAFSA fit in?"];
  }
  if (message.includes("essay")) {
    return ["Help me with my essay", "What makes a strong Why Us essay?", "Should I ask a human advisor?"];
  }
  if (message.includes("deadline")) {
    return ["Track that deadline", "Show my next tasks", "What should I do first?"];
  }
  return ["Find colleges for me", "Compare my options", "What should I do next?"];
}

function buildMockResponse(profile: StudentProfile | null): AdvisorResponse {
  const name = profile?.name?.trim() || "there";
  const major = profile?.intendedMajorLabel || "your intended major";
  const budget = profile?.budgetMax ? `$${profile.budgetMax.toLocaleString()}` : "your budget";

  const text = `Here is the quickest path for you, ${name}: focus on schools that fit ${major}, stay realistic about GPA bands, and keep total cost around ${budget}. Save 3-5 colleges, identify one deadline to act on this week, and use scholarship matching before you finalize your list.`;
  return {
    text,
    suggestions: generateSuggestions(text)
  };
}

export async function getAdvisorResponse(
  history: ChatMessage[],
  profile: StudentProfile | null
): Promise<AdvisorResponse> {
  if (USE_MOCK) {
    return buildMockResponse(profile);
  }

  const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mode: "dashboard",
      message: history[history.length - 1]?.content ?? "",
      history: history.slice(0, -1).map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content
      })),
      currentProfile: profile
        ? {
            name: profile.name,
            gpa: profile.gpa,
            state: profile.stateResidence,
            preferredStates: profile.preferredStates,
            intendedMajor: profile.intendedMajorLabel,
            budget:
              profile.budgetMax <= 20000 ? "low" : profile.budgetMax <= 45000 ? "medium" : "high",
            studentType: profile.studentType
          }
        : {},
      userName: profile?.name || undefined
    })
  });

  if (!response.ok) {
    throw new Error("Advisor response failed.");
  }

  const payload = await response.json();
  const text = payload.response?.content ?? payload.content ?? "I could not generate a reply.";
  const suggestions = payload.response?.suggestions ?? payload.suggestions ?? generateSuggestions(text);
  const recommendedColleges = (payload.response?.matchResults ?? payload.matchResults ?? []).map(
    mapRecommendedCollege
  );

  return {
    text,
    suggestions,
    recommendedColleges
  };
}

export async function streamAdvisorResponse(
  history: ChatMessage[],
  profile: StudentProfile | null,
  onChunk: (chunk: string) => void
): Promise<AdvisorResponse> {
  const response = await getAdvisorResponse(history, profile);
  const words = response.text.split(" ");
  let assembled = "";

  for (const word of words) {
    const chunk = assembled ? ` ${word}` : word;
    assembled += chunk;
    onChunk(chunk);
    await new Promise((resolve) => setTimeout(resolve, 12));
  }

  return response;
}
