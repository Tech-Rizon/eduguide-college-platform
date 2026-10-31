import { NextResponse } from 'next/server'
import { supabaseServer as sb } from '@/lib/supabaseServer'

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

export async function GET(request: Request) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [semRes, entRes] = await Promise.all([
    sb
      .from('gpa_semesters')
      .select('id, name, sort_order, created_at')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    sb
      .from('gpa_entries')
      .select('id, semester_id, course_name, credit_hours, grade_letter, grade_points')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ])

  if (semRes.error) return NextResponse.json({ error: semRes.error.message }, { status: 500 })
  if (entRes.error) return NextResponse.json({ error: entRes.error.message }, { status: 500 })

  type RawEntry = { id: string; semester_id: string; course_name: string; credit_hours: number; grade_letter: string; grade_points: number }
  type RawSemester = { id: string; name: string; sort_order: number; created_at: string }

  const entriesBySemester = ((entRes.data ?? []) as RawEntry[]).reduce<Record<string, RawEntry[]>>(
    (acc, e) => {
      if (!acc[e.semester_id]) acc[e.semester_id] = []
      acc[e.semester_id].push(e)
      return acc
    },
    {},
  )

  const semesters = ((semRes.data ?? []) as RawSemester[]).map((s) => ({
    ...s,
    entries: entriesBySemester[s.id] ?? [],
  }))

  return NextResponse.json({ semesters })
}

export async function POST(request: Request) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: string; sort_order?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Semester name is required' }, { status: 400 })

  // Auto-assign sort_order if not given
  const { data: existing } = await sb
    .from('gpa_semesters')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1)

  type SortRow = { sort_order: number }
  const maxOrder = ((existing ?? []) as SortRow[])[0]?.sort_order ?? -1
  const sortOrder = body.sort_order ?? maxOrder + 1

  const { data, error } = await sb
    .from('gpa_semesters')
    .insert({ user_id: userId, name, sort_order: sortOrder })
    .select('id, name, sort_order, created_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'A semester with that name already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ semester: { ...data, entries: [] } }, { status: 201 })
}
