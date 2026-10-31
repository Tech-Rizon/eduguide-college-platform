-- =============================================================================
-- GPA Tracker (migration 20260302)
-- Tables: gpa_semesters, gpa_entries
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.gpa_semesters (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS gpa_semesters_user_id_idx
  ON public.gpa_semesters (user_id);

ALTER TABLE public.gpa_semesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own gpa_semesters" ON public.gpa_semesters;
CREATE POLICY "Users can manage own gpa_semesters"
  ON public.gpa_semesters FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to gpa_semesters" ON public.gpa_semesters;
CREATE POLICY "Service role full access to gpa_semesters"
  ON public.gpa_semesters FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.gpa_entries (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester_id  UUID         NOT NULL REFERENCES public.gpa_semesters(id) ON DELETE CASCADE,
  course_name  TEXT         NOT NULL,
  credit_hours NUMERIC(4,1) NOT NULL CHECK (credit_hours > 0 AND credit_hours <= 20),
  grade_letter TEXT         NOT NULL,
  grade_points NUMERIC(3,1) NOT NULL CHECK (grade_points >= 0 AND grade_points <= 4.0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gpa_entries_user_id_idx
  ON public.gpa_entries (user_id);
CREATE INDEX IF NOT EXISTS gpa_entries_semester_id_idx
  ON public.gpa_entries (semester_id);

ALTER TABLE public.gpa_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own gpa_entries" ON public.gpa_entries;
CREATE POLICY "Users can manage own gpa_entries"
  ON public.gpa_entries FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to gpa_entries" ON public.gpa_entries;
CREATE POLICY "Service role full access to gpa_entries"
  ON public.gpa_entries FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS gpa_entries_set_updated_at ON public.gpa_entries;
CREATE TRIGGER gpa_entries_set_updated_at
  BEFORE UPDATE ON public.gpa_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
