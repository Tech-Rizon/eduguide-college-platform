-- =============================================================================
-- Migration: 20260302_student_leads.sql
-- Student lead capture table — stores contact info from registration Step 1
-- before the student has created a Supabase auth account.
-- This enables staff to call new leads and help them complete onboarding.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT        NOT NULL,
  last_name  TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  phone      TEXT,
  notes      TEXT,                        -- staff call notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS student_leads_email_idx ON public.student_leads (email);
CREATE INDEX IF NOT EXISTS student_leads_created_at_idx ON public.student_leads (created_at DESC);

ALTER TABLE public.student_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT their own lead (no auth needed — this is pre-registration)
DROP POLICY IF EXISTS "Public lead capture" ON public.student_leads;
CREATE POLICY "Public lead capture"
  ON public.student_leads FOR INSERT
  WITH CHECK (true);

-- Service role gets full access (admin reads/updates via service-role client)
DROP POLICY IF EXISTS "Service role full access to student_leads" ON public.student_leads;
CREATE POLICY "Service role full access to student_leads"
  ON public.student_leads FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Note: No status column — computed at query time by joining auth.users + subscriptions.
-- The table is effectively append-only from the client side.
