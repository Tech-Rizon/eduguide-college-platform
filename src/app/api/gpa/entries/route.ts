import { NextResponse } from 'next/server'
import { supabaseServer as sb } from '@/lib/supabaseServer'
import { resolveGradePoints } from '@/lib/gpaUtils'

function getToken(req: Request): string | null {
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  return token || null
}

export async function POST(request: Request) {
  const token = getToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await sb.auth.getUser(token)
  const userId = userData.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { semester_id?: string; course_name?: string; credit_hours?: number; grade_letter?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { semester_id, course_name, credit_hours, grade_letter } = body

  if (!semester_id) return NextResponse.json({ error: 'semester_id is required' }, { status: 400 })
  if (!course_name?.trim()) return NextResponse.json({ error: 'course_name is required' }, { status: 400 })
  if (!credit_hours || credit_hours <= 0) return NextResponse.json({ error: 'credit_hours must be positive' }, { status: 400 })
  if (!grade_letter) return NextResponse.json({ error: 'grade_letter is required' }, { status: 400 })

  // Verify semester belongs to user
  const { data: sem } = await sb
    .from('gpa_semesters')
    .select('id')
    .eq('id', semester_id)
    .eq('user_id', userId)
    .single()
  if (!sem) return NextResponse.json({ error: 'Semester not found' }, { status: 404 })

  // Server-side grade_points resolution — never trust client
  const grade_points = resolveGradePoints(grade_letter)
  if (grade_points === null) return NextResponse.json({ error: `Invalid grade letter: ${grade_letter}` }, { status: 400 })

  const { data, error } = await sb
    .from('gpa_entries')
    .insert({
      user_id: userId,
      semester_id,
      course_name: course_name.trim(),
      credit_hours,
      grade_letter: grade_letter.trim().toUpperCase(),
      grade_points,
    })
    .select('id, semester_id, course_name, credit_hours, grade_letter, grade_points')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data }, { status: 201 })
}
