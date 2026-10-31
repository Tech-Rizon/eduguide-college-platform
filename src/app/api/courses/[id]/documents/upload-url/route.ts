import { NextResponse } from 'next/server'
import { getUserIdFromHeader } from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const ALLOWED_CONTENT_TYPES = ['application/pdf']
const MAX_NAME_LENGTH = 120

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, MAX_NAME_LENGTH)
}

/**
 * POST /api/courses/[id]/documents/upload-url
 *
 * Creates a course_documents row (status=processing) and returns a signed
 * Supabase Storage upload URL. The client uploads directly to Storage, then
 * calls /process to extract text and embed.
 */
export async function POST(
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

  let body: { fileName?: unknown; contentType?: unknown; displayName?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : ''
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : ''
  const displayName =
    typeof body.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim().slice(0, 100)
      : fileName.replace(/\.[^.]+$/, '').slice(0, 100)

  if (!fileName) {
    return NextResponse.json({ error: 'fileName is required' }, { status: 400 })
  }
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
  }

  const safeName = sanitizeName(fileName)
  const storagePath = `${userId}/${courseId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`

  // Create document row first (status=processing)
  const { data: doc, error: dbError } = await sb
    .from('course_documents')
    .insert({
      course_id: courseId,
      user_id: userId,
      name: displayName,
      file_name: fileName,
      storage_path: storagePath,
      doc_type: 'upload',
      status: 'processing',
    })
    .select('id')
    .single()

  if (dbError || !doc) {
    console.error('upload-url DB insert error:', dbError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // Get signed upload URL from Supabase Storage
  const { data: uploadData, error: storageError } = await sb.storage
    .from('course-materials')
    .createSignedUploadUrl(storagePath)

  if (storageError || !uploadData) {
    console.error('upload-url signed URL error:', storageError)
    // Clean up the document row
    await sb.from('course_documents').delete().eq('id', doc.id)
    return NextResponse.json({ error: 'Storage error' }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: uploadData.signedUrl,
    documentId: doc.id,
    storagePath,
  })
}
