-- =============================================================================
-- Migration: 20260301_college_catalog.sql
-- Database-backed colleges catalog for scalable search and filtering.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.colleges (
  id                     TEXT PRIMARY KEY,
  name                   TEXT NOT NULL,
  location               TEXT NOT NULL,
  state                  TEXT NOT NULL,
  city                   TEXT NOT NULL,
  type                   TEXT NOT NULL CHECK (type IN ('Community College', 'Public University', 'Private University', 'Technical College')),
  tuition_in_state       INTEGER NOT NULL DEFAULT 0,
  tuition_out_state      INTEGER NOT NULL DEFAULT 0,
  tuition_display        TEXT NOT NULL DEFAULT '',
  acceptance_rate_display TEXT NOT NULL DEFAULT '',
  acceptance_rate_num    NUMERIC(5,4) NOT NULL DEFAULT 0,
  min_gpa                NUMERIC(3,2) NOT NULL DEFAULT 0,
  avg_gpa                NUMERIC(3,2) NOT NULL DEFAULT 0,
  ranking                INTEGER NOT NULL DEFAULT 999999,
  enrollment_size        INTEGER NOT NULL DEFAULT 0,
  majors                 TEXT[] NOT NULL DEFAULT '{}',
  tags                   TEXT[] NOT NULL DEFAULT '{}',
  sat_range              TEXT NOT NULL DEFAULT 'N/A',
  act_range              TEXT NOT NULL DEFAULT 'N/A',
  financial_aid_percent  INTEGER NOT NULL DEFAULT 0 CHECK (financial_aid_percent BETWEEN 0 AND 100),
  avg_aid_amount         INTEGER NOT NULL DEFAULT 0,
  graduation_rate        INTEGER NOT NULL DEFAULT 0 CHECK (graduation_rate BETWEEN 0 AND 100),
  description            TEXT NOT NULL DEFAULT '',
  website                TEXT NOT NULL DEFAULT '',
  region                 TEXT NOT NULL DEFAULT '',
  source_type            TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'static_seed', 'firecrawl', 'import')),
  source_url             TEXT,
  source_metadata        JSONB,
  source_last_scraped_at TIMESTAMPTZ,
  is_active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS search_text TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.sync_colleges_search_text()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_text := lower(
    concat_ws(
      ' ',
      coalesce(NEW.name, ''),
      coalesce(NEW.location, ''),
      coalesce(NEW.state, ''),
      coalesce(NEW.city, ''),
      coalesce(NEW.description, ''),
      array_to_string(coalesce(NEW.majors, ARRAY[]::TEXT[]), ' '),
      array_to_string(coalesce(NEW.tags, ARRAY[]::TEXT[]), ' ')
    )
  );

  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS colleges_is_active_idx ON public.colleges (is_active);
CREATE INDEX IF NOT EXISTS colleges_state_idx ON public.colleges (state);
CREATE INDEX IF NOT EXISTS colleges_type_idx ON public.colleges (type);
CREATE INDEX IF NOT EXISTS colleges_ranking_idx ON public.colleges (ranking);
CREATE INDEX IF NOT EXISTS colleges_name_lower_idx ON public.colleges (LOWER(name));
CREATE INDEX IF NOT EXISTS colleges_search_text_trgm_idx
  ON public.colleges
  USING gin (search_text gin_trgm_ops);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active colleges" ON public.colleges;
CREATE POLICY "Public can view active colleges"
  ON public.colleges
  FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "Service role full access to colleges" ON public.colleges;
CREATE POLICY "Service role full access to colleges"
  ON public.colleges
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS colleges_set_updated_at ON public.colleges;
CREATE TRIGGER colleges_set_updated_at
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS colleges_sync_search_text ON public.colleges;
CREATE TRIGGER colleges_sync_search_text
  BEFORE INSERT OR UPDATE ON public.colleges
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_colleges_search_text();

UPDATE public.colleges
SET search_text = lower(
  concat_ws(
    ' ',
    coalesce(name, ''),
    coalesce(location, ''),
    coalesce(state, ''),
    coalesce(city, ''),
    coalesce(description, ''),
    array_to_string(coalesce(majors, ARRAY[]::TEXT[]), ' '),
    array_to_string(coalesce(tags, ARRAY[]::TEXT[]), ' ')
  )
)
WHERE search_text = '';
