import { NextResponse } from 'next/server'
import {
  getUserIdFromHeader,
  embedText,
  searchCourseChunks,
} from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

type ToolType = 'notes' | 'flashcards' | 'exam' | 'workspace'

const TOOL_PROMPTS: Record<ToolType, (context: string, extra: string) => string> = {
  notes: (context, topic) => `You are an expert study assistant. Extract and explain the 10 most important concepts from the following course material${topic ? ` on the topic: "${topic}"` : ''}.

Format your response as:
## Key Concepts

For each concept:
**[Concept Name]**
- Clear definition (1-2 sentences)
- Why it matters / how it connects to other ideas
- Example if helpful

---

COURSE MATERIAL:
${context}`,

  flashcards: (context, topic) => `You are a study aid generator. Create 15 high-quality flashcard pairs from the following course material${topic ? ` focused on: "${topic}"` : ''}.

Format each flashcard as:
**Q:** [question]
**A:** [concise answer]

Make questions test genuine understanding, not just recall. Vary the question types (define, explain, compare, apply).

---

COURSE MATERIAL:
${context}`,

  exam: (context, topic) => `You are an experienced professor. Write 10 realistic exam questions with model answers based on the following course material${topic ? ` on: "${topic}"` : ''}.

Include a mix of:
- 3 short-answer questions
- 4 explanation/analysis questions
- 3 application/scenario questions

For each question:
**Q[n]: [question]**
*Model Answer:* [detailed answer]

---

COURSE MATERIAL:
${context}`,

  workspace: (context, extras) => `You are an academic writing coach. Help the student with their assignment using the course materials provided.

${extras}

---

COURSE MATERIALS (use these to ground your advice):
${context}

---

Provide:
1. **Feedback on the approach** — how well does the draft address the assignment and rubric?
2. **Structure suggestions** — what sections or arguments to include
3. **Key points from course materials** — specific content from above that should be referenced
4. **Writing tips** — style, depth, evidence use

Be constructive and specific. Reference the course materials directly where relevant.`,
}

/**
 * POST /api/courses/[id]/tools
 *
 * AI study tools grounded in course materials.
 * Body: {
 *   tool: 'notes' | 'flashcards' | 'exam' | 'workspace',
 *   topic?: string,           // for notes/flashcards/exam — focus topic
 *   documentId?: string,      // optionally limit to one document
 *   assignmentDesc?: string,  // for workspace
 *   rubric?: string,          // for workspace
 *   draft?: string,           // for workspace
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courseId } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify course ownership
  const { data: course } = await sb
    .from('courses')
    .select('id, name, code')
    .eq('id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: {
    tool?: unknown
    topic?: unknown
    documentId?: unknown
    assignmentDesc?: unknown
    rubric?: unknown
    draft?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tool = body.tool as ToolType
  if (!['notes', 'flashcards', 'exam', 'workspace'].includes(tool)) {
    return NextResponse.json(
      { error: 'tool must be one of: notes, flashcards, exam, workspace' },
      { status: 400 },
    )
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 200) : ''
  const documentId = typeof body.documentId === 'string' ? body.documentId : null

  // 1. Get context chunks — either from a specific document or the full course
  let contextText = ''

  if (documentId) {
    // Fetch chunks from a single document
    const { data: chunks } = await sb
      .from('course_chunks')
      .select('content, chunk_index')
      .eq('document_id', documentId)
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .order('chunk_index', { ascending: true })
      .limit(20)

    contextText = (chunks ?? []).map((c: { content: string }) => c.content).join('\n\n')
  } else {
    // Use RAG to get most relevant chunks for the topic
    const queryText = topic || `key concepts in ${course.name}`
    const queryEmbedding = await embedText(queryText)
    const matches = await searchCourseChunks(courseId, userId, queryEmbedding, 10)
    contextText = matches.map((m) => `[${m.documentName}]\n${m.content}`).join('\n\n---\n\n')
  }

  if (!contextText.trim()) {
    return NextResponse.json(
      { error: 'No course materials available. Upload or paste content first.' },
      { status: 422 },
    )
  }

  // 2. Build tool-specific extras (for workspace)
  let extras = ''
  if (tool === 'workspace') {
    const assignmentDesc = typeof body.assignmentDesc === 'string' ? body.assignmentDesc.trim() : ''
    const rubric = typeof body.rubric === 'string' ? body.rubric.trim() : ''
    const draft = typeof body.draft === 'string' ? body.draft.trim() : ''

    if (!assignmentDesc) {
      return NextResponse.json(
        { error: 'assignmentDesc is required for the workspace tool' },
        { status: 400 },
      )
    }

    extras = [
      `**Assignment:** ${assignmentDesc}`,
      rubric ? `**Rubric / Marking Criteria:** ${rubric}` : '',
      draft ? `**Student's Draft So Far:**\n${draft}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')
  }

  // 3. Generate prompt and call OpenAI
  const promptFn = TOOL_PROMPTS[tool]
  const prompt = promptFn(contextText.slice(0, 12000), extras || topic)

  const model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4.1-mini'

  const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.5,
    }),
  })

  if (!openAiRes.ok) {
    const errText = await openAiRes.text()
    console.error('OpenAI tools error:', errText)
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const completion = (await openAiRes.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const content = completion.choices[0]?.message?.content ?? ''

  return NextResponse.json({ content })
}
