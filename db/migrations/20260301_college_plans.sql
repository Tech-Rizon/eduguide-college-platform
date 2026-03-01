-- =============================================================================
-- Migration: 20260301_college_plans.sql
-- Adds college_shortlist and college_checklist_items tables for My College Plan.
-- =============================================================================

-- college_shortlist: one row per student per college
CREATE TABLE IF NOT EXISTS public.college_shortlist (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id   TEXT        NOT NULL,   -- matches collegeDatabase[].id (e.g. "ucla")
  college_name TEXT        NOT NULL,   -- denormalized for display
  status       TEXT        NOT NULL DEFAULT 'planning',
                                       -- planning|applying|submitted|accepted|rejected|waitlisted|enrolled
  deadline     DATE,
  notes        TEXT,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, college_id)
);

CREATE INDEX IF NOT EXISTS college_shortlist_user_id_idx
  ON public.college_shortlist (user_id);

ALTER TABLE public.college_shortlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own shortlist" ON public.college_shortlist;
CREATE POLICY "Users can manage own shortlist"
  ON public.college_shortlist FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to college_shortlist" ON public.college_shortlist;
CREATE POLICY "Service role full access to college_shortlist"
  ON public.college_shortlist FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS college_shortlist_set_updated_at ON public.college_shortlist;
CREATE TRIGGER college_shortlist_set_updated_at
  BEFORE UPDATE ON public.college_shortlist
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- college_checklist_items: per-student per-college checklist tasks
CREATE TABLE IF NOT EXISTS public.college_checklist_items (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id TEXT        NOT NULL,
  task       TEXT        NOT NULL,
  completed  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, college_id, task)
);

CREATE INDEX IF NOT EXISTS college_checklist_items_user_id_idx
  ON public.college_checklist_items (user_id);
CREATE INDEX IF NOT EXISTS college_checklist_items_college_idx
  ON public.college_checklist_items (user_id, college_id);

ALTER TABLE public.college_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own checklist items" ON public.college_checklist_items;
CREATE POLICY "Users can manage own checklist items"
  ON public.college_checklist_items FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to college_checklist_items" ON public.college_checklist_items;
CREATE POLICY "Service role full access to college_checklist_items"
  ON public.college_checklist_items FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
