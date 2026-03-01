-- =============================================================================
-- Migration: 20260301_course_intelligence.sql
-- Course Intelligence System — pgvector RAG on student course materials.
-- Prerequisites: enable the "vector" extension in Supabase first.
-- =============================================================================

-- Enable pgvector (must be done via Supabase Dashboard → Extensions → vector,
-- or this line if your Supabase role has superuser privileges).
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- courses: one row per student per course
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name      TEXT        NOT NULL,          -- "Intro to Biology"
  code      TEXT,                          -- "BIO 101"
  professor TEXT,
  semester  TEXT,                          -- "Spring 2026"
  color     TEXT        NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS courses_user_id_idx ON public.courses (user_id);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own courses" ON public.courses;
CREATE POLICY "Users can manage own courses"
  ON public.courses FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to courses" ON public.courses;
CREATE POLICY "Service role full access to courses"
  ON public.courses FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS courses_set_updated_at ON public.courses;
CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================================================
-- course_documents: metadata for uploaded PDFs or text pastes
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_documents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  file_name     TEXT,
  storage_path  TEXT,                      -- Supabase Storage path (uploads only)
  doc_type      TEXT        NOT NULL DEFAULT 'upload', -- 'upload' | 'paste'
  char_count    INTEGER,
  chunk_count   INTEGER,
  status        TEXT        NOT NULL DEFAULT 'processing',
                                           -- 'processing' | 'ready' | 'failed'
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_documents_course_id_idx ON public.course_documents (course_id);
CREATE INDEX IF NOT EXISTS course_documents_user_status_idx ON public.course_documents (user_id, status);

ALTER TABLE public.course_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own course_documents" ON public.course_documents;
CREATE POLICY "Users can manage own course_documents"
  ON public.course_documents FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to course_documents" ON public.course_documents;
CREATE POLICY "Service role full access to course_documents"
  ON public.course_documents FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- course_chunks: vector-embedded text chunks for RAG search
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.course_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID        NOT NULL REFERENCES public.course_documents(id) ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  chunk_index INTEGER     NOT NULL,
  token_count INTEGER,
  embedding   vector(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_chunks_document_id_idx ON public.course_chunks (document_id);
CREATE INDEX IF NOT EXISTS course_chunks_course_id_idx   ON public.course_chunks (course_id);
-- HNSW index for fast approximate cosine similarity search
CREATE INDEX IF NOT EXISTS course_chunks_embedding_hnsw_idx
  ON public.course_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE public.course_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own course_chunks" ON public.course_chunks;
CREATE POLICY "Users can manage own course_chunks"
  ON public.course_chunks FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to course_chunks" ON public.course_chunks;
CREATE POLICY "Service role full access to course_chunks"
  ON public.course_chunks FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- match_course_chunks: similarity search RPC called from API routes
-- =============================================================================
CREATE OR REPLACE FUNCTION public.match_course_chunks(
  query_embedding vector(1536),
  match_course_id uuid,
  match_user_id   uuid,
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id            uuid,
  content       text,
  document_name text,
  similarity    float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    cc.id,
    cc.content,
    cd.name AS document_name,
    1 - (cc.embedding <=> query_embedding) AS similarity
  FROM public.course_chunks cc
  JOIN public.course_documents cd ON cc.document_id = cd.id
  WHERE cc.course_id    = match_course_id
    AND cc.user_id      = match_user_id
    AND cc.embedding IS NOT NULL
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_course_chunks(vector, uuid, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_course_chunks(vector, uuid, uuid, int) TO service_role;

-- =============================================================================
-- Storage bucket for course materials (private)
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', FALSE)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
