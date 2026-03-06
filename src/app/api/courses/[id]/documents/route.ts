import { NextResponse } from 'next/server'
import { getUserIdFromHeader } from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

/**
 * GET /api/courses/[id]/documents
 * Returns all documents for a course, ordered newest first.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courseId } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify course ownership
  const { data: course } = await sb
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await sb
    .from('course_documents')
    .select('id, name, file_name, doc_type, status, error_message, chunk_count, char_count, created_at')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('GET /api/courses/[id]/documents error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ documents: data ?? [] })
}
