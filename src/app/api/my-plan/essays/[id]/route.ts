import { NextResponse } from 'next/server'
import { supabaseServer as sb } from '@/lib/supabaseServer'

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

/**
 * PATCH /api/my-plan/essays/[id]
 * Save draft — body: { draft_text?, title?, prompt_text?, essay_type? }
 * word_count is always recomputed server-side from draft_text.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: {
    draft_text?: unknown
    title?: unknown
    prompt_text?: unknown
    essay_type?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.draft_text !== undefined) {
    const text = typeof body.draft_text === 'string' ? body.draft_text : ''
    updates.draft_text = text
    updates.word_count = countWords(text)
  }

  if (body.title !== undefined) {
    updates.title = typeof body.title === 'string' ? body.title.trim() || null : null
  }

  if (body.prompt_text !== undefined) {
    updates.prompt_text = typeof body.prompt_text === 'string' ? body.prompt_text.trim() || null : null
  }

  if (body.essay_type !== undefined) {
    const validTypes = ['common_app', 'why_us', 'supplemental', 'scholarship']
    const et = typeof body.essay_type === 'string' ? body.essay_type.trim() : ''
    if (!validTypes.includes(et)) {
      return NextResponse.json(
        { error: `essay_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 },
      )
    }
    updates.essay_type = et
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await sb
    .from('college_essays')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, college_id, college_name, essay_type, title, prompt_text, draft_text, word_count, ai_feedback, feedback_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ essay: data })
}

/**
 * DELETE /api/my-plan/essays/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await sb
    .from('college_essays')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
