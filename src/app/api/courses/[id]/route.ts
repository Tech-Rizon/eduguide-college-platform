import { NextResponse } from 'next/server'
import { getUserIdFromHeader } from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const VALID_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#6366f1',
]

/**
 * GET /api/courses/[id]
 * Returns a single course with its documents.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: course, error } = await sb
    .from('courses')
    .select('id, name, code, professor, semester, color, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('GET /api/courses/[id] error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ course })
}

/**
 * PATCH /api/courses/[id]
 * Updates course metadata. Only the owner can update.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { name?: unknown; code?: unknown; professor?: unknown; semester?: unknown; color?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'name must be 1-100 characters' }, { status: 400 })
    }
    updates.name = name
  }
  if (body.code !== undefined) updates.code = body.code === null ? null : String(body.code).trim().slice(0, 20)
  if (body.professor !== undefined) updates.professor = body.professor === null ? null : String(body.professor).trim().slice(0, 100)
  if (body.semester !== undefined) updates.semester = body.semester === null ? null : String(body.semester).trim().slice(0, 50)
  if (body.color !== undefined) {
    if (typeof body.color === 'string' && VALID_COLORS.includes(body.color)) {
      updates.color = body.color
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await sb
    .from('courses')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('PATCH /api/courses/[id] error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/courses/[id]
 * Deletes a course and all its documents, chunks, and storage objects.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch storage paths before deletion for cleanup
  const { data: docs } = await sb
    .from('course_documents')
    .select('storage_path')
    .eq('course_id', id)
    .eq('user_id', userId)

  // Delete Storage objects (non-fatal)
  const paths = (docs ?? []).map((d: { storage_path: string | null }) => d.storage_path).filter(Boolean) as string[]
  if (paths.length > 0) {
    await sb.storage.from('course-materials').remove(paths)
  }

  const { error } = await sb
    .from('courses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('DELETE /api/courses/[id] error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
