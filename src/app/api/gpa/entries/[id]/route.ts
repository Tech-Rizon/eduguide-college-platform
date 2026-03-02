import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resolveGradePoints } from '@/lib/gpaUtils'

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

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

  let body: { course_name?: string; credit_hours?: number; grade_letter?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const updates: Record<string, unknown> = {}

  if (body.course_name !== undefined) {
    const name = body.course_name.trim()
    if (!name) return NextResponse.json({ error: 'course_name cannot be empty' }, { status: 400 })
    updates.course_name = name
  }
  if (body.credit_hours !== undefined) {
    if (body.credit_hours <= 0) return NextResponse.json({ error: 'credit_hours must be positive' }, { status: 400 })
    updates.credit_hours = body.credit_hours
  }
  if (body.grade_letter !== undefined) {
    const pts = resolveGradePoints(body.grade_letter)
    if (pts === null) return NextResponse.json({ error: `Invalid grade letter: ${body.grade_letter}` }, { status: 400 })
    updates.grade_letter = body.grade_letter.trim().toUpperCase()
    updates.grade_points = pts
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data, error } = await sb
    .from('gpa_entries')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, semester_id, course_name, credit_hours, grade_letter, grade_points')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ entry: data })
}

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
    .from('gpa_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
