/**
 * courseIntelligence.ts
 * Shared utilities for the Course Intelligence System.
 * - Text chunking
 * - OpenAI batch embeddings (text-embedding-3-small)
 * - pgvector similarity search via RPC
 */

import { supabaseServer } from '@/lib/supabaseServer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChunkMatch {
  id: string
  content: string
  documentName: string
  similarity: number
}

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

/**
 * Split text into overlapping chunks for embedding.
 * Uses character-based sliding window — simple, predictable, fast.
 */
export function chunkText(
  text: string,
  chunkSize = 2000,
  overlap = 200,
): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length)
    const chunk = cleaned.slice(start, end).trim()
    if (chunk.length > 50) {
      chunks.push(chunk)
    }
    if (end === cleaned.length) break
    start += chunkSize - overlap
  }

  return chunks
}

// ---------------------------------------------------------------------------
// OpenAI embeddings
// ---------------------------------------------------------------------------

const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small'

/**
 * Batch-embed an array of strings using OpenAI text-embedding-3-small.
 * Returns one float[] per input string.
 * OpenAI supports up to 2048 inputs per request; we batch at 100 to be safe.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const BATCH = 100
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI embeddings error (${res.status}): ${err}`)
    }

    const data = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>
    }

    // Sort by index to preserve order
    const sorted = data.data.sort((a, b) => a.index - b.index)
    results.push(...sorted.map((d) => d.embedding))
  }

  return results
}

/**
 * Embed a single string and return its vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text])
  return vec
}

// ---------------------------------------------------------------------------
// pgvector similarity search
// ---------------------------------------------------------------------------

/**
 * Search for the most relevant course chunks using cosine similarity.
 * Calls the match_course_chunks RPC (service-role bypasses RLS; function
 * filters by user_id and course_id internally).
 */
export async function searchCourseChunks(
  courseId: string,
  userId: string,
  queryEmbedding: number[],
  matchCount = 5,
): Promise<ChunkMatch[]> {
  const { data, error } = await supabaseServer.rpc('match_course_chunks', {
    query_embedding: queryEmbedding,
    match_course_id: courseId,
    match_user_id: userId,
    match_count: matchCount,
  })

  if (error) {
    console.error('match_course_chunks RPC error:', error)
    return []
  }

  return (data as Array<{ id: string; content: string; document_name: string; similarity: number }>).map(
    (row) => ({
      id: row.id,
      content: row.content,
      documentName: row.document_name,
      similarity: row.similarity,
    }),
  )
}

// ---------------------------------------------------------------------------
// Auth helper (shared across course API routes)
// ---------------------------------------------------------------------------

/**
 * Extract the authenticated userId from an Authorization header.
 * Returns null if the token is missing or invalid.
 */
export async function getUserIdFromHeader(
  authHeader: string | null,
): Promise<string | null> {
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const { data, error } = await supabaseServer.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user.id
}
