import { NextResponse } from 'next/server'
import {
  getUserIdFromHeader,
  chunkText,
  embedTexts,
} from '@/lib/courseIntelligence'
import { importWebContentAsText } from '@/lib/firecrawlMagic'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CONTENT_CHARS = 100_000

/**
 * POST /api/courses/[id]/documents/import-url
 *
 * Imports a public webpage with Firecrawl, chunks it, embeds the content,
 * and stores it as a course document.
 * Body: { url: string, name?: string }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courseId } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: course } = await sb
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: { url?: unknown; name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const providedName = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''

  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'url must be valid' }, { status: 400 })
  }

  const imported = await importWebContentAsText(url)
  if (!imported) {
    return NextResponse.json(
      { error: 'Could not import readable content from that URL' },
      { status: 400 },
    )
  }

  const name = providedName || imported.name
  const content = imported.content.slice(0, MAX_CONTENT_CHARS)

  const { data: doc, error: docError } = await sb
    .from('course_documents')
    .insert({
      course_id: courseId,
      user_id: userId,
      name,
      doc_type: 'web',
      file_name: imported.sourceUrl,
      char_count: content.length,
      status: 'processing',
    })
    .select('id')
    .single()

  if (docError || !doc) {
    console.error('web import doc insert error:', docError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  try {
    const chunks = chunkText(content)
    const embeddings = await embedTexts(chunks)

    const rows = chunks.map((chunk, i) => ({
      document_id: doc.id,
      course_id: courseId,
      user_id: userId,
      content: chunk,
      chunk_index: i,
      token_count: Math.ceil(chunk.length / 4),
      embedding: JSON.stringify(embeddings[i]),
    }))

    const { error: chunkError } = await sb.from('course_chunks').insert(rows)
    if (chunkError) throw chunkError

    await sb
      .from('course_documents')
      .update({ status: 'ready', chunk_count: chunks.length })
      .eq('id', doc.id)

    return NextResponse.json({
      ok: true,
      documentId: doc.id,
      chunkCount: chunks.length,
      sourceUrl: imported.sourceUrl,
    })
  } catch (err) {
    console.error('web import embed error:', err)
    const msg = err instanceof Error ? err.message : 'Embedding failed'
    await sb
      .from('course_documents')
      .update({ status: 'failed', error_message: msg })
      .eq('id', doc.id)
    return NextResponse.json({ error: 'Embedding failed' }, { status: 500 })
  }
}
