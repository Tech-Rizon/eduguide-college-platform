-- =============================================================================
-- Migration: 20260322_program_matching.sql
-- Real-time program matching + durable student match profiles.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_match_profiles (
  user_id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_type             TEXT        NOT NULL DEFAULT 'freshman'
                           CHECK (student_type IN ('freshman', 'transfer')),
  residency_state          TEXT,
  target_states            TEXT[]      NOT NULL DEFAULT '{}',
  zip_code                 TEXT,
  max_distance_miles       INTEGER,
  intended_program         TEXT,
  program_keywords         TEXT[]      NOT NULL DEFAULT '{}',
  degree_level             TEXT        NOT NULL DEFAULT 'bachelor'
                           CHECK (degree_level IN ('certificate', 'associate', 'bachelor')),
  modality                 TEXT        NOT NULL DEFAULT 'any'
                           CHECK (modality IN ('in_person', 'online', 'hybrid', 'any')),
  start_term               TEXT,
  gpa                      NUMERIC(3,2),
  budget_level             TEXT
                           CHECK (budget_level IN ('low', 'medium', 'high')),
  max_annual_tuition       INTEGER,
  sat_score                INTEGER,
  act_score                INTEGER,
  current_college_name     TEXT,
  completed_college_credits INTEGER,
  hs_completed             BOOLEAN,
  english_proficiency      TEXT,
  needs_financial_aid      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_first_gen             BOOLEAN     NOT NULL DEFAULT FALSE,
  support_needs            TEXT[]      NOT NULL DEFAULT '{}',
  career_goal              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_match_profiles_student_type_idx
  ON public.student_match_profiles (student_type);
CREATE INDEX IF NOT EXISTS student_match_profiles_residency_state_idx
  ON public.student_match_profiles (residency_state);

ALTER TABLE public.student_match_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own student match profile" ON public.student_match_profiles;
CREATE POLICY "Users can view own student match profile"
  ON public.student_match_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own student match profile" ON public.student_match_profiles;
CREATE POLICY "Users can manage own student match profile"
  ON public.student_match_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to student_match_profiles" ON public.student_match_profiles;
CREATE POLICY "Service role full access to student_match_profiles"
  ON public.student_match_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS student_match_profiles_set_updated_at ON public.student_match_profiles;
CREATE TRIGGER student_match_profiles_set_updated_at
  BEFORE UPDATE ON public.student_match_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS public.college_programs (
  id                        TEXT PRIMARY KEY,
  college_id                TEXT        NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  program_name              TEXT        NOT NULL,
  program_slug              TEXT        NOT NULL,
  degree_level              TEXT        NOT NULL DEFAULT 'bachelor'
                             CHECK (degree_level IN ('certificate', 'associate', 'bachelor')),
  modality                  TEXT        NOT NULL DEFAULT 'any'
                             CHECK (modality IN ('in_person', 'online', 'hybrid', 'any')),
  campus_name               TEXT        NOT NULL DEFAULT '',
  department_name           TEXT        NOT NULL DEFAULT '',
  program_url               TEXT,
  admissions_url            TEXT,
  application_deadline      TEXT,
  start_terms               TEXT[]      NOT NULL DEFAULT '{}',
  transfer_friendly         BOOLEAN     NOT NULL DEFAULT FALSE,
  freshman_open             BOOLEAN     NOT NULL DEFAULT TRUE,
  international_open        BOOLEAN     NOT NULL DEFAULT TRUE,
  requires_portfolio        BOOLEAN     NOT NULL DEFAULT FALSE,
  requires_audition         BOOLEAN     NOT NULL DEFAULT FALSE,
  requires_background_check BOOLEAN     NOT NULL DEFAULT FALSE,
  accreditation             TEXT,
  extraction_status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (extraction_status IN ('pending', 'partial', 'complete', 'failed')),
  last_scraped_at           TIMESTAMPTZ,
  source_metadata           JSONB,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS college_programs_identity_idx
  ON public.college_programs (college_id, program_slug, degree_level, campus_name);
CREATE INDEX IF NOT EXISTS college_programs_college_id_idx
  ON public.college_programs (college_id);
CREATE INDEX IF NOT EXISTS college_programs_program_slug_idx
  ON public.college_programs (program_slug);
CREATE INDEX IF NOT EXISTS college_programs_degree_level_idx
  ON public.college_programs (degree_level);
CREATE INDEX IF NOT EXISTS college_programs_extraction_status_idx
  ON public.college_programs (extraction_status);

ALTER TABLE public.college_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view college programs" ON public.college_programs;
CREATE POLICY "Public can view college programs"
  ON public.college_programs FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Service role full access to college_programs" ON public.college_programs;
CREATE POLICY "Service role full access to college_programs"
  ON public.college_programs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS college_programs_set_updated_at ON public.college_programs;
CREATE TRIGGER college_programs_set_updated_at
  BEFORE UPDATE ON public.college_programs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TABLE IF NOT EXISTS public.program_requirements (
  id               TEXT PRIMARY KEY,
  program_id       TEXT        NOT NULL REFERENCES public.college_programs(id) ON DELETE CASCADE,
  requirement_type TEXT        NOT NULL
                   CHECK (requirement_type IN ('min_gpa', 'prereq_course', 'test_policy', 'english', 'residency', 'application_item', 'note')),
  label            TEXT        NOT NULL,
  value_text       TEXT,
  value_num        NUMERIC(6,2),
  operator         TEXT,
  is_required      BOOLEAN     NOT NULL DEFAULT TRUE,
  source_url       TEXT,
  last_verified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS program_requirements_identity_idx
  ON public.program_requirements (program_id, requirement_type, label);
CREATE INDEX IF NOT EXISTS program_requirements_program_id_idx
  ON public.program_requirements (program_id);
CREATE INDEX IF NOT EXISTS program_requirements_requirement_type_idx
  ON public.program_requirements (requirement_type);

ALTER TABLE public.program_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view program requirements" ON public.program_requirements;
CREATE POLICY "Public can view program requirements"
  ON public.program_requirements FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Service role full access to program_requirements" ON public.program_requirements;
CREATE POLICY "Service role full access to program_requirements"
  ON public.program_requirements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS program_requirements_set_updated_at ON public.program_requirements;
CREATE TRIGGER program_requirements_set_updated_at
  BEFORE UPDATE ON public.program_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
