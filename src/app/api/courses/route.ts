import { NextResponse } from 'next/server'
import { getUserIdFromHeader } from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const VALID_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#6366f1',
]

/**
 * GET /api/courses
 * Returns the authenticated student's courses with document counts.
 */
export async function GET(request: Request) {
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await sb
    .from('courses')
    .select(`
      id, name, code, professor, semester, color, created_at, updated_at,
      course_documents(count)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('GET /api/courses error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  type CourseRow = { id: string; name: string; code: string | null; professor: string | null; semester: string | null; color: string; created_at: string; updated_at: string; course_documents: Array<{ count: number }> | null }
  const courses = ((data ?? []) as CourseRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    professor: c.professor,
    semester: c.semester,
    color: c.color,
    created_at: c.created_at,
    updated_at: c.updated_at,
    document_count: Array.isArray(c.course_documents)
      ? (c.course_documents as Array<{ count: number }>)[0]?.count ?? 0
      : 0,
  }))

  return NextResponse.json({ courses })
}

/**
 * POST /api/courses
 * Creates a new course for the authenticated student.
 */
export async function POST(request: Request) {
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: unknown; code?: unknown; professor?: unknown; semester?: unknown; color?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'name is required and must be ≤100 characters' }, { status: 400 })
  }

  const code = typeof body.code === 'string' ? body.code.trim().slice(0, 20) : null
  const professor = typeof body.professor === 'string' ? body.professor.trim().slice(0, 100) : null
  const semester = typeof body.semester === 'string' ? body.semester.trim().slice(0, 50) : null
  const color =
    typeof body.color === 'string' && VALID_COLORS.includes(body.color)
      ? body.color
      : '#3b82f6'

  const { data: course, error } = await sb
    .from('courses')
    .insert({ user_id: userId, name, code, professor, semester, color })
    .select('id, name, code, professor, semester, color, created_at')
    .single()

  if (error) {
    console.error('POST /api/courses error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ course }, { status: 201 })
}
