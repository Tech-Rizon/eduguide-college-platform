import { NextResponse } from 'next/server'
import { supabaseServer as sb } from '@/lib/supabaseServer'
import { resolveAccess, canAccess, denyAccess } from '@/lib/accessGate'

export const dynamic = 'force-dynamic'

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

const ESSAY_TYPE_LABELS: Record<string, string> = {
  common_app: 'Common App personal statement (650 word limit)',
  why_us: '"Why Us" supplemental essay',
  supplemental: 'supplemental essay',
  scholarship: 'scholarship essay',
}

/**
 * POST /api/my-plan/essays/[id]/feedback
 *
 * Calls OpenAI to generate admissions feedback on the draft.
 * Stores result in ai_feedback + feedback_at columns.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Subscription gate: AI essay feedback requires Elite
  const { tier } = await resolveAccess(userId, sb)
  if (!canAccess(tier, 'essays')) return denyAccess('essays', 'elite')

  // Fetch the essay (ownership check via user_id)
  const { data: essay, error: fetchError } = await sb
    .from('college_essays')
    .select('id, essay_type, college_name, prompt_text, draft_text, word_count')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (fetchError || !essay) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!essay.draft_text || essay.draft_text.trim().length < 50) {
    return NextResponse.json(
      { error: 'Draft is too short. Write at least 50 characters before requesting feedback.' },
      { status: 400 },
    )
  }

  const essayTypeLabel = ESSAY_TYPE_LABELS[essay.essay_type] ?? 'college essay'
  const promptLines = [
    `You are an experienced college admissions counselor reviewing a student's ${essayTypeLabel} for ${essay.college_name}.`,
    essay.prompt_text ? `\nESSAY PROMPT:\n${essay.prompt_text}` : '',
    `\nDRAFT (${essay.word_count} words):\n${essay.draft_text}`,
    `\nProvide concise, actionable feedback covering:
1. **Strength** — Start with one specific strength in the draft.
2. **Hook** — Is the opening compelling? Suggest improvements if needed.
3. **Authenticity & Voice** — Does the student's personality come through?
4. **Structure & Flow** — Is the narrative well-organized?
5. **Word Choice** — Highlight any weak phrases and suggest stronger alternatives.
6. **College Fit** — Does the essay reflect genuine interest in ${essay.college_name}?

Give 3–5 specific, actionable improvements. Keep your total response under 400 words.`,
  ]
    .filter(Boolean)
    .join('\n')

  const model = process.env.OPENAI_CHAT_MODEL ?? 'gpt-4.1-mini'

  const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert college admissions counselor. Give honest, specific, and encouraging feedback. Never be vague.',
        },
        { role: 'user', content: promptLines },
      ],
      max_tokens: 700,
      temperature: 0.6,
    }),
  })

  if (!openAiRes.ok) {
    const errText = await openAiRes.text()
    console.error('OpenAI essay feedback error:', errText)
    return NextResponse.json({ error: 'AI service error' }, { status: 502 })
  }

  const completion = (await openAiRes.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const feedbackText = completion.choices[0]?.message?.content ?? ''

  // Persist feedback
  const { data: updated, error: updateError } = await sb
    .from('college_essays')
    .update({ ai_feedback: feedbackText, feedback_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, ai_feedback, feedback_at')
    .single()

  if (updateError) {
    console.error('Failed to save essay feedback:', updateError)
    // Return feedback even if save failed
    return NextResponse.json({ feedback: feedbackText })
  }

  return NextResponse.json({ feedback: updated.ai_feedback, feedback_at: updated.feedback_at })
}
