-- =============================================================================
-- Migration: 20260228_referral_antabuse_and_attributions
-- Adds anti-abuse hold columns to referrals, unique constraint on
-- stripe_session_id, stripe_subscription_id linkage, and a new
-- referral_attributions table for UTM / click tracking.
-- =============================================================================

-- 1) New columns on referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS qualified_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rewarded_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Unique constraint so we can upsert on stripe_session_id from the webhook
ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_stripe_session_id_unique;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_stripe_session_id_unique UNIQUE (stripe_session_id);

CREATE INDEX IF NOT EXISTS referrals_stripe_subscription_id_idx
  ON public.referrals (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS referrals_qualified_at_idx
  ON public.referrals (qualified_at)
  WHERE qualified_at IS NOT NULL;

-- 2) referral_attributions: one row per landing-page visit via a referral link
CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code    TEXT        NOT NULL,
  referrer_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id       TEXT,         -- client-generated cookie/fingerprint ID
  landing_url      TEXT,
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  ip_hash          TEXT,         -- SHA-256 of IP — NOT reversible, analytics only
  user_agent_hash  TEXT,         -- SHA-256 of UA — NOT reversible, analytics only
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_attributions_code_idx
  ON public.referral_attributions (referral_code);
CREATE INDEX IF NOT EXISTS referral_attributions_visitor_id_idx
  ON public.referral_attributions (visitor_id)
  WHERE visitor_id IS NOT NULL;

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

-- Only service role writes; no direct user access
DROP POLICY IF EXISTS "Service role full access to referral_attributions"
  ON public.referral_attributions;
CREATE POLICY "Service role full access to referral_attributions"
  ON public.referral_attributions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3) Increment referral clicks via a simple RPC (used by the click endpoint)
CREATE OR REPLACE FUNCTION public.increment_referral_clicks(ref_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_codes
  SET clicks = clicks + 1
  WHERE code = ref_code;
END;
$$;
