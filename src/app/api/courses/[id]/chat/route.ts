import { NextResponse } from 'next/server'
import {
  getUserIdFromHeader,
  embedText,
  searchCourseChunks,
} from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * POST /api/courses/[id]/chat
 *
 * RAG-powered course chat. Embeds the query, retrieves the most relevant
 * chunks from course materials, and passes them as context to OpenAI.
 * Returns { content, sources }.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courseId } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify course ownership and get metadata
  const { data: course } = await sb
    .from('courses')
    .select('id, name, code, professor, semester')
    .eq('id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: { message?: unknown; history?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 })

  const history: ChatMessage[] = Array.isArray(body.history)
    ? (body.history as ChatMessage[]).slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content.slice(0, 1000) : '',
      }))
    : []

  // 1. Embed the query
  const queryEmbedding = await embedText(message)

  // 2. Retrieve top-5 matching chunks
  const matches = await searchCourseChunks(courseId, userId, queryEmbedding, 5)

  // 3. Build system prompt with course context
  const courseLabel = [course.name, course.code].filter(Boolean).join(' — ')
  const professorLine = course.professor ? `Professor: ${course.professor}` : ''
  const semesterLine = course.semester ? `Semester: ${course.semester}` : ''

  const contextBlock =
    matches.length > 0
      ? matches
          .map((m) => `[From "${m.documentName}"]\n${m.content}`)
          .join('\n\n---\n\n')
      : 'No course materials have been uploaded yet.'

  const systemPrompt = [
    `You are a dedicated study assistant for ${courseLabel}.`,
    professorLine,
    semesterLine,
    '',
    'COURSE MATERIALS (use these to ground your answers):',
    '---',
    contextBlock,
    '---',
    '',
    'Instructions:',
    '- Answer the student\'s question using the course materials above as your primary source.',
    '- When an answer comes directly from the materials, reference the document name.',
    '- If the question isn\'t covered by the materials, answer from general knowledge and note this.',
    '- Keep answers clear, well-structured, and focused on learning.',
    '- Help the student understand, not just copy — explain *why*, not just *what*.',
  ]
    .filter(Boolean)
    .join('\n')

  // 4. Call OpenAI
  const model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4.1-mini'
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1200,
      temperature: 0.4,
    }),
  })

  if (!openAiRes.ok) {
    const errText = await openAiRes.text()
    console.error('OpenAI chat error:', errText)
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const completion = (await openAiRes.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const content = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.'

  const sources = matches.map((m) => ({
    documentName: m.documentName,
    preview: m.content.slice(0, 120) + (m.content.length > 120 ? '…' : ''),
    similarity: Math.round(m.similarity * 100),
  }))

  return NextResponse.json({ content, sources })
}
