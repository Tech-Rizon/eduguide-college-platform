import { NextResponse } from 'next/server'
import {
  getUserIdFromHeader,
  chunkText,
  embedTexts,
} from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CONTENT_CHARS = 100_000

/**
 * POST /api/courses/[id]/documents/paste
 *
 * Accepts raw text content, chunks it, embeds all chunks, and stores the
 * result. Everything happens inline (no Storage upload step).
 * Body: { name: string, content: string }
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

  let body: { name?: unknown; content?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
  const content = typeof body.content === 'string' ? body.content.trim() : ''

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!content || content.length < 50) {
    return NextResponse.json({ error: 'content must be at least 50 characters' }, { status: 400 })
  }
  if (content.length > MAX_CONTENT_CHARS) {
    return NextResponse.json(
      { error: `content must be ≤${MAX_CONTENT_CHARS} characters` },
      { status: 400 },
    )
  }

  // Create document row
  const { data: doc, error: docError } = await sb
    .from('course_documents')
    .insert({
      course_id: courseId,
      user_id: userId,
      name,
      doc_type: 'paste',
      char_count: content.length,
      status: 'processing',
    })
    .select('id')
    .single()

  if (docError || !doc) {
    console.error('paste doc insert error:', docError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  try {
    // Chunk + embed
    const chunks = chunkText(content)
    const embeddings = await embedTexts(chunks)

    const rows = chunks.map((chunk, i) => ({
      document_id: doc.id,
      course_id: courseId,
      user_id: userId,
      content: chunk,
      chunk_index: i,
      token_count: Math.ceil(chunk.length / 4), // rough estimate
      embedding: JSON.stringify(embeddings[i]),
    }))

    const { error: chunkError } = await sb.from('course_chunks').insert(rows)
    if (chunkError) throw chunkError

    // Mark document ready
    await sb
      .from('course_documents')
      .update({ status: 'ready', chunk_count: chunks.length })
      .eq('id', doc.id)

    return NextResponse.json({ ok: true, documentId: doc.id, chunkCount: chunks.length })
  } catch (err) {
    console.error('paste embed error:', err)
    const msg = err instanceof Error ? err.message : 'Embedding failed'
    await sb
      .from('course_documents')
      .update({ status: 'failed', error_message: msg })
      .eq('id', doc.id)
    return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
  }
}
