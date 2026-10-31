import { NextResponse } from 'next/server'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

/**
 * GET /api/my-plan/essays
 * Returns all essays for the authenticated user.
 */
export async function GET(request: Request) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('college_essays')
    .select('id, college_id, college_name, essay_type, title, prompt_text, draft_text, word_count, ai_feedback, feedback_at, created_at, updated_at')
    .eq('user_id', userId)
    .order('college_name', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ essays: data ?? [] })
}

/**
 * POST /api/my-plan/essays
 * Creates a new essay entry.
 * Body: { college_id, college_name, essay_type, title?, prompt_text? }
 */
export async function POST(request: Request) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    college_id?: unknown
    college_name?: unknown
    essay_type?: unknown
    title?: unknown
    prompt_text?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const college_id = typeof body.college_id === 'string' ? body.college_id.trim() : ''
  const college_name = typeof body.college_name === 'string' ? body.college_name.trim() : ''
  const essay_type = typeof body.essay_type === 'string' ? body.essay_type.trim() : ''

  if (!college_id) return NextResponse.json({ error: 'college_id is required' }, { status: 400 })
  if (!college_name) return NextResponse.json({ error: 'college_name is required' }, { status: 400 })

  const validTypes = ['common_app', 'why_us', 'supplemental', 'scholarship']
  if (!validTypes.includes(essay_type)) {
    return NextResponse.json(
      { error: `essay_type must be one of: ${validTypes.join(', ')}` },
      { status: 400 },
    )
  }

  const insert: Record<string, unknown> = {
    user_id: userId,
    college_id,
    college_name,
    essay_type,
    draft_text: '',
    word_count: 0,
  }

  if (typeof body.title === 'string' && body.title.trim()) {
    insert.title = body.title.trim()
  }
  if (typeof body.prompt_text === 'string' && body.prompt_text.trim()) {
    insert.prompt_text = body.prompt_text.trim()
  }

  const { data, error } = await sb
    .from('college_essays')
    .insert(insert)
    .select('id, college_id, college_name, essay_type, title, prompt_text, draft_text, word_count, ai_feedback, feedback_at, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ essay: data }, { status: 201 })
}
