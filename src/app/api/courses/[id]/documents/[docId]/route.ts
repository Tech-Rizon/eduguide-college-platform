import { NextResponse } from 'next/server'
import { getUserIdFromHeader } from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/courses/[id]/documents/[docId]
 * Removes a document, its chunks (cascade), and its Storage object if present.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id: courseId, docId } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch storage_path before deleting
  const { data: doc } = await sb
    .from('course_documents')
    .select('storage_path')
    .eq('id', docId)
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete Storage object if present (non-fatal)
  if (doc.storage_path) {
    await sb.storage.from('course-materials').remove([doc.storage_path])
  }

  const { error } = await sb
    .from('course_documents')
    .delete()
    .eq('id', docId)
    .eq('user_id', userId)

  if (error) {
    console.error('DELETE /api/courses/[id]/documents/[docId] error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
