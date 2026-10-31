-- =============================================================================
-- College Essay Builder (migration 20260302)
-- Table: college_essays
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.college_essays (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id   TEXT        NOT NULL,
  college_name TEXT        NOT NULL,
  essay_type   TEXT        NOT NULL DEFAULT 'common_app'
               CHECK (essay_type IN ('common_app', 'why_us', 'supplemental', 'scholarship')),
  title        TEXT,
  prompt_text  TEXT,
  draft_text   TEXT        NOT NULL DEFAULT '',
  word_count   INTEGER     NOT NULL DEFAULT 0,
  ai_feedback  TEXT,
  feedback_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS college_essays_user_id_idx
  ON public.college_essays (user_id);
CREATE INDEX IF NOT EXISTS college_essays_user_college_idx
  ON public.college_essays (user_id, college_id);

ALTER TABLE public.college_essays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own college_essays" ON public.college_essays;
CREATE POLICY "Users can manage own college_essays"
  ON public.college_essays FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to college_essays" ON public.college_essays;
CREATE POLICY "Service role full access to college_essays"
  ON public.college_essays FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS college_essays_set_updated_at ON public.college_essays;
CREATE TRIGGER college_essays_set_updated_at
  BEFORE UPDATE ON public.college_essays
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();
