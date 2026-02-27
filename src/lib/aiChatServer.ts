import { processMessage, type UserProfile } from "./aiEngine";
import { collegeDatabase, type CollegeEntry } from "./collegeDatabase";
import type { AIChatResponse, AIChatSource, AIChatTurn } from "./aiChatTypes";

interface ResearchNote {
  college: CollegeEntry;
  summary: string;
  source: AIChatSource;
}

interface FirecrawlScrapePayload {
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
}

interface OpenAIResponsesPayload {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string | { value?: string };
    }>;
  }>;
}

export interface GenerateAiChatInput {
  currentProfile: UserProfile;
  history?: AIChatTurn[];
  message: string;
  mode?: "demo" | "dashboard";
  userName?: string;
}

const FIRECRAWL_API_URL = "https://api.firecrawl.dev/v1/scrape";
const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const MAX_HISTORY_TURNS = 14;
const MAX_RESEARCH_COLLEGES = 2;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "the",
  "to",
  "university",
  "college",
  "campus",
  "school",
]);

function uniqueStrings(values: string[] | undefined): string[] | undefined {
  if (!values?.length) return undefined;
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeProfileUpdates(
  currentProfile: UserProfile,
  updates: Partial<UserProfile> | undefined
): Partial<UserProfile> | undefined {
  if (!updates) return undefined;

  return {
    ...updates,
    demographics: uniqueStrings([...(currentProfile.demographics || []), ...(updates.demographics || [])]),
    preferredStates: uniqueStrings([...(currentProfile.preferredStates || []), ...(updates.preferredStates || [])]),
    interests: uniqueStrings([...(currentProfile.interests || []), ...(updates.interests || [])]),
  };
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function buildAcronym(name: string): string {
  return name
    .split(/[\s,]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part && !STOP_WORDS.has(part))
    .map((part) => part[0])
    .join("");
}

function buildCollegeAliases(college: CollegeEntry): string[] {
  const aliases = new Set<string>();
  const fullName = normalizeText(college.name);
  if (fullName) aliases.add(fullName);

  const acronym = buildAcronym(college.name);
  if (acronym.length >= 2) aliases.add(acronym);

  const shortName = fullName
    .replace(/^university of /, "")
    .replace(/^college of /, "")
    .replace(/^the /, "")
    .trim();
  if (shortName && shortName !== fullName) aliases.add(shortName);

  if (college.city) aliases.add(normalizeText(college.city));

  return Array.from(aliases);
}

function findMentionedColleges(message: string): CollegeEntry[] {
  const normalizedMessage = normalizeText(message);
  if (!normalizedMessage) return [];

  return collegeDatabase.filter((college) =>
    buildCollegeAliases(college).some((alias) => {
      if (!alias) return false;
      const pattern = new RegExp(`\\b${alias.replace(/\s+/g, "\\s+")}\\b`, "i");
      return pattern.test(normalizedMessage);
    })
  );
}

function detectAssignmentSupportIntent(message: string): boolean {
  return /\b(assignment|homework|essay|paper|discussion post|worksheet|lab report|quiz|study guide|project|draft|outline)\b/i.test(
    message
  );
}

function pickResearchColleges(message: string, colleges: CollegeEntry[] | undefined): CollegeEntry[] {
  const explicitMatches = findMentionedColleges(message);
  if (explicitMatches.length > 0) {
    return explicitMatches.slice(0, MAX_RESEARCH_COLLEGES);
  }

  return (colleges || []).slice(0, MAX_RESEARCH_COLLEGES);
}

function buildResearchKeywords(message: string, college: CollegeEntry, profile: UserProfile): string[] {
  const keywords = new Set<string>([
    college.name,
    college.city,
    college.state,
    "admissions",
    "financial aid",
    "scholarships",
    "academics",
    "programs",
    "student life",
    "transfer",
  ]);

  if (profile.intendedMajor) keywords.add(profile.intendedMajor);
  if (detectAssignmentSupportIntent(message)) keywords.add("academic support");

  const extra = message.match(/[a-zA-Z][a-zA-Z-]{3,}/g) || [];
  for (const token of extra.slice(0, 12)) {
    keywords.add(token.toLowerCase());
  }

  return Array.from(keywords);
}

function sentenceScore(line: string, keywords: string[]): number {
  const normalized = line.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    const token = keyword.toLowerCase().trim();
    if (!token) continue;
    if (normalized.includes(token)) score += token.includes(" ") ? 4 : 2;
  }

  if (normalized.includes("admission")) score += 2;
  if (normalized.includes("scholar")) score += 2;
  if (normalized.includes("program")) score += 2;
  if (normalized.includes("student")) score += 1;
  if (normalized.includes("campus")) score += 1;
  if (normalized.includes("support")) score += 1;

  return score;
}

function extractResearchSummary(markdown: string, keywords: string[]): string {
  const candidates = markdown
    .split(/\n+/)
    .map((line) => line.replace(/[#>*`-]+/g, " ").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 45 && line.length <= 260);

  const scored = candidates
    .map((line) => ({ line, score: sentenceScore(line, keywords) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return candidates.slice(0, 2).join(" ").slice(0, 320);
  }

  return scored
    .slice(0, 2)
    .map((entry) => entry.line)
    .join(" ")
    .slice(0, 360);
}

async function fetchResearchNote(
  college: CollegeEntry,
  message: string,
  profile: UserProfile
): Promise<ResearchNote | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(FIRECRAWL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: college.website,
        formats: ["markdown"],
        onlyMainContent: true,
        timeout: 25000,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => ({}))) as FirecrawlScrapePayload;
    if (!response.ok || !payload.success || !payload.data) {
      return null;
    }

    const markdown = payload.data.markdown?.trim();
    const metadata = payload.data.metadata;
    const summary =
      (markdown && extractResearchSummary(markdown, buildResearchKeywords(message, college, profile))) ||
      metadata?.description?.trim() ||
      college.description;

    return {
      college,
      summary,
      source: {
        title: metadata?.title?.trim() || `${college.name} official site`,
        url: metadata?.sourceURL?.trim() || metadata?.url?.trim() || college.website,
        note: summary,
      },
    };
  } catch (error) {
    console.error(`Firecrawl research failed for ${college.name}:`, error);
    return null;
  }
}

async function getCollegeResearch(
  colleges: CollegeEntry[],
  message: string,
  profile: UserProfile
): Promise<ResearchNote[]> {
  if (!process.env.FIRECRAWL_API_KEY || colleges.length === 0) return [];

  const results = await Promise.all(
    colleges.map((college) => fetchResearchNote(college, message, profile))
  );

  return results.filter((result): result is ResearchNote => Boolean(result));
}

function summarizeCollegeFit(colleges: CollegeEntry[] | undefined): string {
  if (!colleges?.length) return "No college matches were generated yet.";

  return colleges
    .slice(0, 4)
    .map(
      (college) =>
        `${college.name} (${college.location}) | ${college.type} | ${college.tuition} | majors: ${college.majors.slice(0, 3).join(", ")}`
    )
    .join("\n");
}

function buildPrompt(
  input: GenerateAiChatInput,
  response: AIChatResponse,
  mergedProfile: UserProfile,
  research: ResearchNote[]
): string {
  const history = (input.history || [])
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => `${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content}`)
    .join("\n");

  const researchBlock =
    research.length > 0
      ? research
          .map(
            (item) =>
              `- ${item.college.name}: ${item.summary} (source: ${item.source.url})`
          )
          .join("\n")
      : "No fresh official-site research was available for this turn.";

  return [
    `Mode: ${input.mode || "dashboard"}`,
    `User name: ${input.userName || "Student"}`,
    `Current merged profile: ${JSON.stringify(mergedProfile)}`,
    `Recent conversation:\n${history || "No prior conversation."}`,
    `User message: ${input.message}`,
    `Local recommendation engine draft:\n${response.content}`,
    `Recommended colleges:\n${summarizeCollegeFit(response.colleges)}`,
    `Fresh official-school research:\n${researchBlock}`,
  ].join("\n\n");
}

function buildSystemInstructions(mode: "demo" | "dashboard" | undefined, assignmentSupport: boolean): string {
  const modeContext = mode === "demo"
    ? "DEMO MODE: The student is not signed in yet. Give them real value immediately so they see the product is worth it — but naturally mention that signing up unlocks saved preferences, deeper school tracking, and free assignment help for every class they're in."
    : "DASHBOARD MODE: The student is signed in. You already know pieces of their profile. Pick up where you left off. Be their go-to person, not a service bot.";

  const assignmentContext = assignmentSupport
    ? `ASSIGNMENT MODE: The student needs help with coursework RIGHT NOW. This is a core free feature for signed-in students. Be their sharp study partner:
  - First, make sure you understand exactly what the assignment is asking. If unclear, ask one clarifying question.
  - Break the prompt into what the instructor actually wants to see.
  - Explain any concepts or terms the student needs to understand to do this well.
  - Suggest a clear structure or approach — not a finished essay, but a roadmap they can own.
  - Offer to review their draft, check their thesis, explain a concept in more depth, or practice questions with them.
  - Be substantive. A student stuck on Organic Chemistry at midnight needs real help, not platitudes.`
    : "If coursework comes up in passing, mention that you can help with assignments too — prompt breakdowns, concept explanations, outlines, study plans, and draft review — all free for signed-in students.";

  return [
    "You are EduGuide's expert college advisor and academic support assistant. You're the smartest, most connected friend a college student could have — one who actually went through the system and knows every shortcut, every trick, and every trap.",
    "",
    "TONE: Warm, direct, and genuinely curious about this student's specific situation. Sound like a real person, not a corporate assistant. Use contractions. Be informal where it fits ('weed-out course', 'reach school', 'gut class', 'waitlisted'). Skip the hollow openers — never say 'Great question!', 'Certainly!', or 'Of course!' Just answer.",
    "",
    "DEPTH: Every response should feel tailored. Reference the student's actual GPA, state, major, and budget when you have them. Don't give generic school facts — explain WHY this school fits or doesn't fit THIS student's specific situation.",
    "",
    "ENGAGEMENT: Always end with 1-2 sharp follow-up questions that move the student toward a real decision. Make the questions specific — not 'Do you have any other questions?' but 'If you applied to UCLA and Berkeley, which vibe fits you better — big research culture or the Bay Area job market?' Keep the conversation going.",
    "",
    "RESEARCH: When fresh official-site data is provided, weave it in naturally — 'I just pulled this from their admissions page' or 'their site says...'. Never invent facts, stats, or deadlines you don't have. If you don't have live data, say so and offer what you do know.",
    "",
    "FORMAT: Keep it tight and scannable. 2-4 short paragraphs or crisp bullet points. No walls of text. Students are busy — they should be able to read your reply in under 30 seconds and know exactly what to do next.",
    "",
    assignmentContext,
    "",
    modeContext,
  ].join("\n");
}

function extractOpenAIText(payload: OpenAIResponsesPayload): string | null {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) return null;

  const chunks: string[] = [];
  for (const item of payload.output) {
    if (!Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (typeof part.text === "string" && part.text.trim()) {
        chunks.push(part.text.trim());
        continue;
      }

      if (part.text && typeof part.text === "object" && typeof part.text.value === "string" && part.text.value.trim()) {
        chunks.push(part.text.value.trim());
      }
    }
  }

  return chunks.length > 0 ? chunks.join("\n").trim() : null;
}

async function generateOpenAIResponse(
  input: GenerateAiChatInput,
  response: AIChatResponse,
  mergedProfile: UserProfile,
  research: ResearchNote[]
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const apiResponse = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
        instructions: buildSystemInstructions(input.mode, detectAssignmentSupportIntent(input.message)),
        input: buildPrompt(input, response, mergedProfile, research),
      }),
      cache: "no-store",
    });

    const payload = (await apiResponse.json().catch(() => ({}))) as OpenAIResponsesPayload & {
      error?: { message?: string };
    };

    if (!apiResponse.ok) {
      console.error("OpenAI chat generation failed:", payload.error?.message || apiResponse.statusText);
      return null;
    }

    return extractOpenAIText(payload);
  } catch (error) {
    console.error("OpenAI chat generation failed:", error);
    return null;
  }
}

function buildFallbackResponse(
  input: GenerateAiChatInput,
  response: AIChatResponse,
  mergedProfile: UserProfile,
  research: ResearchNote[]
): string {
  const name = input.userName ? `${input.userName}` : null;
  const lines: string[] = [];

  if (detectAssignmentSupportIntent(input.message)) {
    lines.push(
      `${name ? `${name}, ` : ""}let's work through this together. Paste the assignment prompt and tell me what class it's for — I'll break it down, explain the concepts, and help you map out the best approach.`
    );
    if (research.length > 0) {
      lines.push(
        research.map((item) => `From ${item.college.name}'s site: ${item.summary}`).join("\n\n")
      );
    }
  } else if (response.colleges?.length) {
    const profileBits = [
      mergedProfile.gpa ? `GPA ${mergedProfile.gpa}` : null,
      mergedProfile.state ? `in ${mergedProfile.state}` : null,
      mergedProfile.intendedMajor ? `studying ${mergedProfile.intendedMajor}` : null,
      mergedProfile.budget === "low" ? "on a tight budget" : mergedProfile.budget === "medium" ? "mid-range budget" : mergedProfile.budget === "high" ? "budget not an issue" : null,
    ].filter(Boolean);

    const intro = profileBits.length
      ? `Here's what fits your profile${name ? `, ${name}` : ""} — ${profileBits.join(", ")}:`
      : `Here are some strong options to start with${name ? `, ${name}` : ""}:`;
    lines.push(intro);

    lines.push(
      response.colleges
        .slice(0, 3)
        .map(
          (college) =>
            `**${college.name}** (${college.location}) — ${college.description} Tuition: ${college.tuition}. Strong in ${college.majors.slice(0, 2).join(" and ")}.`
        )
        .join("\n\n")
    );

    if (research.length > 0) {
      lines.push(
        `From the official sites:\n${research
          .map((item) => `- **${item.college.name}**: ${item.summary}`)
          .join("\n")}`
      );
    }
  } else {
    lines.push(response.content);
    if (research.length > 0) {
      lines.push(
        research.map((item) => `From ${item.college.name}'s official site: ${item.summary}`).join("\n\n")
      );
    }
  }

  const followUps = response.followUpQuestions?.slice(0, 2) ?? [
    "Want me to narrow these down by cost, acceptance rate, or something else?",
    "Should I pull up transfer pathways or financial aid details for any of these?",
  ];
  lines.push(followUps.map((q) => `→ ${q}`).join("\n"));

  return lines.filter(Boolean).join("\n\n");
}

export async function generateAiChatResponse(
  input: GenerateAiChatInput
): Promise<AIChatResponse> {
  const baseResponse = processMessage(input.message, input.currentProfile, input.userName);
  const profileUpdates = normalizeProfileUpdates(input.currentProfile, baseResponse.profileUpdates);
  const mergedProfile = { ...input.currentProfile, ...profileUpdates };
  const researchColleges = pickResearchColleges(input.message, baseResponse.colleges);
  const research = await getCollegeResearch(researchColleges, input.message, mergedProfile);
  const generatedContent =
    (await generateOpenAIResponse(input, { ...baseResponse, profileUpdates }, mergedProfile, research)) ||
    buildFallbackResponse(input, { ...baseResponse, profileUpdates }, mergedProfile, research);

  return {
    ...baseResponse,
    content: generatedContent,
    profileUpdates,
    sources: research.map((item) => item.source),
  };
}
