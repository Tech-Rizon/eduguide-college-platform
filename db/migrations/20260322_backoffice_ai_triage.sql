ALTER TABLE public.backoffice_tickets
  ADD COLUMN IF NOT EXISTS ai_triage_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (ai_triage_status IN ('not_requested', 'pending', 'complete', 'failed')),
  ADD COLUMN IF NOT EXISTS ai_triage_intent TEXT,
  ADD COLUMN IF NOT EXISTS ai_triage_specialty TEXT
    CHECK (ai_triage_specialty IN ('support', 'tutor')),
  ADD COLUMN IF NOT EXISTS ai_triage_risk_level TEXT
    CHECK (ai_triage_risk_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS ai_triage_urgency_score INTEGER
    CHECK (ai_triage_urgency_score >= 0 AND ai_triage_urgency_score <= 100),
  ADD COLUMN IF NOT EXISTS ai_triage_confidence NUMERIC(4,3)
    CHECK (ai_triage_confidence >= 0 AND ai_triage_confidence <= 1),
  ADD COLUMN IF NOT EXISTS ai_triage_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_triage_draft_reply TEXT,
  ADD COLUMN IF NOT EXISTS ai_triage_last_error TEXT,
  ADD COLUMN IF NOT EXISTS ai_triage_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_ai_triage_status
  ON public.backoffice_tickets (ai_triage_status);

CREATE TABLE IF NOT EXISTS public.ai_triage_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.backoffice_tickets(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('tutoring_request', 'support_request', 'manual')),
  source_id UUID,
  requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  model TEXT,
  prompt_version TEXT NOT NULL DEFAULT 'backoffice-triage-v1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'complete', 'failed')),
  intent TEXT,
  specialty TEXT CHECK (specialty IN ('support', 'tutor')),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  urgency_score INTEGER CHECK (urgency_score >= 0 AND urgency_score <= 100),
  confidence NUMERIC(4,3) CHECK (confidence >= 0 AND confidence <= 1),
  summary TEXT,
  draft_reply TEXT,
  raw_output JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_triage_runs_ticket_started_at
  ON public.ai_triage_runs (ticket_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_triage_runs_status
  ON public.ai_triage_runs (status, started_at DESC);

ALTER TABLE public.ai_triage_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to ai_triage_runs" ON public.ai_triage_runs;
CREATE POLICY "Service role full access to ai_triage_runs"
  ON public.ai_triage_runs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
