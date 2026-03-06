import { NextResponse } from 'next/server'
import {
  getUserIdFromHeader,
  chunkText,
  embedTexts,
} from '@/lib/courseIntelligence'
import { supabaseServer as sb } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
// Allow up to 60 s for large PDFs (requires Vercel Pro)
export const maxDuration = 60

/**
 * POST /api/courses/[id]/documents/[docId]/process
 *
 * Called after the client successfully uploads a PDF to Supabase Storage.
 * Downloads the file, extracts text with unpdf, chunks, embeds, and stores.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id: courseId, docId } = await params
  const userId = await getUserIdFromHeader(request.headers.get('Authorization'))
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the document to get storage_path and verify ownership
  const { data: doc } = await sb
    .from('course_documents')
    .select('id, storage_path, status')
    .eq('id', docId)
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!doc.storage_path) {
    return NextResponse.json({ error: 'No storage path — use the paste endpoint for text input' }, { status: 400 })
  }

  const markFailed = async (msg: string) => {
    await sb
      .from('course_documents')
      .update({ status: 'failed', error_message: msg })
      .eq('id', docId)
  }

  try {
    // 1. Download PDF buffer from Supabase Storage
    const { data: fileData, error: downloadError } = await sb.storage
      .from('course-materials')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      await markFailed('Could not download file from storage')
      return NextResponse.json({ error: 'Storage download failed' }, { status: 500 })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // 2. Extract text with unpdf
    let extractedText = ''
    try {
      const { extractText } = await import('unpdf')
      const result = await extractText(uint8Array, { mergePages: true })
      extractedText = typeof result === 'string' ? result : result.text ?? ''
    } catch (pdfErr) {
      console.error('PDF extraction error:', pdfErr)
      await markFailed('Could not extract text from PDF. The file may be scanned or encrypted.')
      return NextResponse.json({ error: 'PDF text extraction failed' }, { status: 422 })
    }

    if (!extractedText || extractedText.trim().length < 50) {
      await markFailed('PDF appears to contain no readable text (may be scanned or image-based).')
      return NextResponse.json(
        { error: 'No readable text found in PDF' },
        { status: 422 },
      )
    }

    // 3. Chunk
    const chunks = chunkText(extractedText)

    // 4. Batch embed
    const embeddings = await embedTexts(chunks)

    // 5. Insert chunks into DB
    const rows = chunks.map((chunk, i) => ({
      document_id: docId,
      course_id: courseId,
      user_id: userId,
      content: chunk,
      chunk_index: i,
      token_count: Math.ceil(chunk.length / 4),
      embedding: JSON.stringify(embeddings[i]),
    }))

    const { error: insertError } = await sb.from('course_chunks').insert(rows)
    if (insertError) throw insertError

    // 6. Mark document ready
    await sb
      .from('course_documents')
      .update({
        status: 'ready',
        chunk_count: chunks.length,
        char_count: extractedText.length,
      })
      .eq('id', docId)

    return NextResponse.json({ ok: true, chunkCount: chunks.length })
  } catch (err) {
    console.error('process route error:', err)
    const msg = err instanceof Error ? err.message : 'Processing failed'
    await markFailed(msg)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }
}
