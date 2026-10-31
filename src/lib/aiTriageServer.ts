import { getStudentMatchProfile } from "@/lib/collegeMatchServer";
import { buildSupportResearchPacket } from "@/lib/firecrawlMagic";
import { supabaseServer } from "@/lib/supabaseServer";

export type AiTriageStatus = "not_requested" | "pending" | "complete" | "failed";
export type AiTriageRiskLevel = "low" | "medium" | "high";
export type AiTriageSpecialty = "support" | "tutor";
export type AiTriagePriority = "low" | "medium" | "high" | "urgent";

type AiTriageIntent =
  | "school_matching"
  | "financial_aid"
  | "essay_help"
  | "deadline_support"
  | "course_help"
  | "account_support"
  | "technical_support"
  | "billing_support"
  | "general_guidance";

type BackofficeTicketRow = {
  id: string;
  source_type: "tutoring_request" | "support_request" | "manual";
  source_id: string | null;
  student_user_id: string | null;
  requester_email: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: AiTriagePriority;
  status: string;
  assigned_team: AiTriageSpecialty | null;
};

type SupportRequestRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  message: string;
  priority: string;
  status: string;
  source: string;
};

type TutoringRequestRow = {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  description: string | null;
  priority: string | null;
  status: string;
};

type ParsedTriagePayload = {
  intent: AiTriageIntent;
  specialty: AiTriageSpecialty;
  riskLevel: AiTriageRiskLevel;
  urgencyScore: number;
  priority: AiTriagePriority;
  confidence: number;
  summary: string;
  draftReply: string;
  missingInfo: string[];
  rationale: string;
};

type AiTriageRunRow = {
  id: string;
  ticket_id: string;
  status: Exclude<AiTriageStatus, "not_requested">;
  intent: string | null;
  specialty: string | null;
  risk_level: string | null;
  urgency_score: number | null;
  confidence: number | null;
  summary: string | null;
  draft_reply: string | null;
  error_message: string | null;
};

const OPENAI_TRIAGE_MODEL =
  process.env.OPENAI_TRIAGE_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini";

const INTENTS: AiTriageIntent[] = [
  "school_matching",
  "financial_aid",
  "essay_help",
  "deadline_support",
  "course_help",
  "account_support",
  "technical_support",
  "billing_support",
  "general_guidance",
];

function normalizeIntent(value: unknown): AiTriageIntent {
  return INTENTS.includes(value as AiTriageIntent)
    ? (value as AiTriageIntent)
    : "general_guidance";
}

function normalizeSpecialty(value: unknown, fallback: AiTriageSpecialty): AiTriageSpecialty {
  return value === "support" || value === "tutor" ? value : fallback;
}

function normalizeRiskLevel(value: unknown): AiTriageRiskLevel {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function normalizePriority(value: unknown, fallback: AiTriagePriority): AiTriagePriority {
  return value === "low" || value === "medium" || value === "high" || value === "urgent"
    ? value
    : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeText(value: unknown, maxLength: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;

    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function fallbackSpecialty(ticket: BackofficeTicketRow): AiTriageSpecialty {
  return ticket.source_type === "tutoring_request" || ticket.category === "tutoring"
    ? "tutor"
    : "support";
}

function priorityRank(priority: AiTriagePriority): number {
  switch (priority) {
    case "urgent":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

function maxPriority(current: AiTriagePriority, proposed: AiTriagePriority): AiTriagePriority {
  return priorityRank(proposed) > priorityRank(current) ? proposed : current;
}

function summarizeMatchProfile(profile: Awaited<ReturnType<typeof getStudentMatchProfile>>): string {
  if (!profile) return "No saved match profile facts.";

  const lines = [
    profile.studentType ? `- Student type: ${profile.studentType}` : "",
    profile.residencyState ? `- State: ${profile.residencyState}` : "",
    profile.intendedProgram ? `- Intended program: ${profile.intendedProgram}` : "",
    typeof profile.gpa === "number" ? `- GPA: ${profile.gpa}` : "",
    profile.budgetLevel ? `- Budget: ${profile.budgetLevel}` : "",
    profile.currentCollegeName ? `- Current college: ${profile.currentCollegeName}` : "",
    typeof profile.completedCollegeCredits === "number"
      ? `- Completed credits: ${profile.completedCollegeCredits}`
      : "",
    profile.modality ? `- Modality: ${profile.modality}` : "",
    profile.startTerm ? `- Start term: ${profile.startTerm}` : "",
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "No saved match profile facts.";
}

async function loadTicket(ticketId: string): Promise<BackofficeTicketRow | null> {
  const { data, error } = await supabaseServer
    .from("backoffice_tickets")
    .select(
      "id, source_type, source_id, student_user_id, requester_email, title, description, category, priority, status, assigned_team"
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error) throw error;
  return (data as BackofficeTicketRow | null) ?? null;
}

async function loadSupportRequest(sourceId: string): Promise<SupportRequestRow | null> {
  const { data, error } = await supabaseServer
    .from("support_requests")
    .select("id, user_id, name, email, message, priority, status, source")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) throw error;
  return (data as SupportRequestRow | null) ?? null;
}

async function loadTutoringRequest(sourceId: string): Promise<TutoringRequestRow | null> {
  const { data, error } = await supabaseServer
    .from("tutoring_requests")
    .select("id, user_id, category, subject, description, priority, status")
    .eq("id", sourceId)
    .maybeSingle();

  if (error) throw error;
  return (data as TutoringRequestRow | null) ?? null;
}

function buildPromptContext(input: {
  ticket: BackofficeTicketRow;
  supportRequest: SupportRequestRow | null;
  tutoringRequest: TutoringRequestRow | null;
  profileSummary: string;
  researchPacket: string;
}): string {
  const { ticket, supportRequest, tutoringRequest, profileSummary, researchPacket } = input;

  const supportLines = supportRequest
    ? [
        "SUPPORT REQUEST:",
        `- Source: ${supportRequest.source}`,
        `- Name: ${supportRequest.name}`,
        `- Email: ${supportRequest.email}`,
        `- Priority: ${supportRequest.priority}`,
        `- Status: ${supportRequest.status}`,
        `- Message: ${supportRequest.message}`,
      ]
    : [];

  const tutoringLines = tutoringRequest
    ? [
        "TUTORING REQUEST:",
        `- Category: ${tutoringRequest.category}`,
        `- Subject: ${tutoringRequest.subject}`,
        `- Priority: ${tutoringRequest.priority ?? "medium"}`,
        `- Status: ${tutoringRequest.status}`,
        `- Description: ${tutoringRequest.description ?? ""}`,
      ]
    : [];

  return [
    "BACKOFFICE TICKET:",
    `- Ticket ID: ${ticket.id}`,
    `- Source type: ${ticket.source_type}`,
    `- Category: ${ticket.category}`,
    `- Current priority: ${ticket.priority}`,
    `- Current status: ${ticket.status}`,
    `- Assigned team: ${ticket.assigned_team ?? "unassigned"}`,
    `- Requester email: ${ticket.requester_email ?? "unknown"}`,
    `- Title: ${ticket.title}`,
    `- Description: ${ticket.description ?? ""}`,
    "",
    ...supportLines,
    ...tutoringLines,
    "",
    "STUDENT PROFILE FACTS:",
    profileSummary,
    "",
    researchPacket ? `RESEARCH PACKET:\n${researchPacket}` : "RESEARCH PACKET:\nNone",
    "",
    "Return JSON only with this exact shape:",
    '{"intent":"school_matching","specialty":"support","riskLevel":"medium","urgencyScore":55,"priority":"medium","confidence":0.78,"summary":"...","draftReply":"...","missingInfo":["..."],"rationale":"..."}',
    "",
    "Rules:",
    "- `specialty` must be `support` or `tutor`.",
    "- `intent` must use one of the allowed enums from the schema example.",
    "- `riskLevel` must be `low`, `medium`, or `high`.",
    "- `urgencyScore` must be an integer from 0 to 100.",
    "- `priority` must be `low`, `medium`, `high`, or `urgent`.",
    "- `summary` must be 1-2 sentences for staff and mention the key issue plus the next best action.",
    "- `draftReply` must be a concise first reply to the student. Do not promise acceptance, aid, or deadlines unless explicitly stated.",
    "- `missingInfo` should list only the most important facts still needed.",
    "- `rationale` should be one short sentence explaining the routing and urgency decision.",
  ].join("\n");
}

async function callOpenAiForTriage(prompt: string): Promise<ParsedTriagePayload> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_TRIAGE_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You triage student support tickets for a college guidance platform. Return strict JSON only and keep recommendations grounded in the provided facts.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI triage error (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(content);

  if (!parsed) {
    throw new Error("AI triage returned invalid JSON.");
  }

  const fallbackPriority = "medium" as AiTriagePriority;
  return {
    intent: normalizeIntent(parsed.intent),
    specialty: normalizeSpecialty(parsed.specialty, "support"),
    riskLevel: normalizeRiskLevel(parsed.riskLevel),
    urgencyScore: Math.round(clampNumber(parsed.urgencyScore, 0, 100, 50)),
    priority: normalizePriority(parsed.priority, fallbackPriority),
    confidence: clampNumber(parsed.confidence, 0, 1, 0.65),
    summary: normalizeText(parsed.summary, 500, "AI triage completed."),
    draftReply: normalizeText(parsed.draftReply, 2000, ""),
    missingInfo: normalizeStringArray(parsed.missingInfo),
    rationale: normalizeText(parsed.rationale, 500, ""),
  };
}

async function createPendingRun(ticket: BackofficeTicketRow, requestedByUserId?: string | null) {
  const { data, error } = await supabaseServer
    .from("ai_triage_runs")
    .insert({
      ticket_id: ticket.id,
      source_type: ticket.source_type,
      source_id: ticket.source_id,
      requested_by_user_id: requestedByUserId ?? null,
      model: OPENAI_TRIAGE_MODEL,
      prompt_version: "backoffice-triage-v1",
      status: "pending",
    })
    .select("id, ticket_id, status, intent, specialty, risk_level, urgency_score, confidence, summary, draft_reply, error_message")
    .single();

  if (error) throw error;

  await supabaseServer
    .from("backoffice_tickets")
    .update({
      ai_triage_status: "pending",
      ai_triage_last_error: null,
      ai_triage_updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  return data as AiTriageRunRow;
}

async function completeRun(input: {
  runId: string;
  ticket: BackofficeTicketRow;
  triage: ParsedTriagePayload;
}) {
  const { runId, ticket, triage } = input;
  const updatedAt = new Date().toISOString();
  const nextPriority = maxPriority(ticket.priority, triage.priority);

  const { error: runError } = await supabaseServer
    .from("ai_triage_runs")
    .update({
      status: "complete",
      intent: triage.intent,
      specialty: triage.specialty,
      risk_level: triage.riskLevel,
      urgency_score: triage.urgencyScore,
      confidence: triage.confidence,
      summary: triage.summary,
      draft_reply: triage.draftReply,
      raw_output: {
        missingInfo: triage.missingInfo,
        rationale: triage.rationale,
        priority: triage.priority,
      },
      error_message: null,
      completed_at: updatedAt,
    })
    .eq("id", runId);

  if (runError) throw runError;

  const { error: ticketError } = await supabaseServer
    .from("backoffice_tickets")
    .update({
      priority: nextPriority,
      assigned_team: ticket.assigned_team ?? triage.specialty,
      ai_triage_status: "complete",
      ai_triage_intent: triage.intent,
      ai_triage_specialty: triage.specialty,
      ai_triage_risk_level: triage.riskLevel,
      ai_triage_urgency_score: triage.urgencyScore,
      ai_triage_confidence: triage.confidence,
      ai_triage_summary: triage.summary,
      ai_triage_draft_reply: triage.draftReply,
      ai_triage_last_error: null,
      ai_triage_updated_at: updatedAt,
    })
    .eq("id", ticket.id);

  if (ticketError) throw ticketError;

  await supabaseServer.from("backoffice_ticket_events").insert({
    ticket_id: ticket.id,
    actor_user_id: null,
    action: "ai_triage_completed",
    metadata: {
      intent: triage.intent,
      specialty: triage.specialty,
      risk_level: triage.riskLevel,
      urgency_score: triage.urgencyScore,
      confidence: triage.confidence,
      missing_info: triage.missingInfo,
      rationale: triage.rationale,
      proposed_priority: triage.priority,
    },
  });
}

async function failRun(runId: string, ticketId: string, errorMessage: string) {
  const completedAt = new Date().toISOString();

  await supabaseServer
    .from("ai_triage_runs")
    .update({
      status: "failed",
      error_message: errorMessage.slice(0, 1000),
      completed_at: completedAt,
    })
    .eq("id", runId);

  await supabaseServer
    .from("backoffice_tickets")
    .update({
      ai_triage_status: "failed",
      ai_triage_last_error: errorMessage.slice(0, 1000),
      ai_triage_updated_at: completedAt,
    })
    .eq("id", ticketId);

  await supabaseServer.from("backoffice_ticket_events").insert({
    ticket_id: ticketId,
    actor_user_id: null,
    action: "ai_triage_failed",
    metadata: {
      error: errorMessage.slice(0, 1000),
    },
  });
}

export async function findBackofficeTicketBySource(
  sourceType: BackofficeTicketRow["source_type"],
  sourceId: string
): Promise<BackofficeTicketRow | null> {
  const { data, error } = await supabaseServer
    .from("backoffice_tickets")
    .select(
      "id, source_type, source_id, student_user_id, requester_email, title, description, category, priority, status, assigned_team"
    )
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .maybeSingle();

  if (error) throw error;
  return (data as BackofficeTicketRow | null) ?? null;
}

export async function runBackofficeTicketTriage(
  ticketId: string,
  options: { requestedByUserId?: string | null } = {}
): Promise<{ ticket: BackofficeTicketRow; run: AiTriageRunRow }> {
  const ticket = await loadTicket(ticketId);
  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  const pendingRun = await createPendingRun(ticket, options.requestedByUserId);

  try {
    const [supportRequest, tutoringRequest, profile, maybeResearchPacket] = await Promise.all([
      ticket.source_type === "support_request" && ticket.source_id
        ? loadSupportRequest(ticket.source_id)
        : Promise.resolve(null),
      ticket.source_type === "tutoring_request" && ticket.source_id
        ? loadTutoringRequest(ticket.source_id)
        : Promise.resolve(null),
      ticket.student_user_id ? getStudentMatchProfile(ticket.student_user_id) : Promise.resolve(null),
      ticket.description?.includes("Official research packet:")
        ? Promise.resolve("")
        : buildSupportResearchPacket({
            message: [ticket.title, ticket.description ?? ""].filter(Boolean).join("\n\n"),
            userId: ticket.student_user_id,
          }).catch(() => ""),
    ]);

    const prompt = buildPromptContext({
      ticket,
      supportRequest,
      tutoringRequest,
      profileSummary: summarizeMatchProfile(profile),
      researchPacket: maybeResearchPacket,
    });

    const triage = await callOpenAiForTriage(prompt);
    triage.specialty = normalizeSpecialty(triage.specialty, fallbackSpecialty(ticket));
    await completeRun({ runId: pendingRun.id, ticket, triage });

    return {
      ticket,
      run: {
        ...pendingRun,
        status: "complete",
        intent: triage.intent,
        specialty: triage.specialty,
        risk_level: triage.riskLevel,
        urgency_score: triage.urgencyScore,
        confidence: triage.confidence,
        summary: triage.summary,
        draft_reply: triage.draftReply,
        error_message: null,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI triage failed.";
    await failRun(pendingRun.id, ticket.id, message);
    throw error;
  }
}

export async function runBackofficeTicketTriageBySource(
  sourceType: BackofficeTicketRow["source_type"],
  sourceId: string,
  options: { requestedByUserId?: string | null } = {}
) {
  const ticket = await findBackofficeTicketBySource(sourceType, sourceId);
  if (!ticket) return null;
  return runBackofficeTicketTriage(ticket.id, options);
}
