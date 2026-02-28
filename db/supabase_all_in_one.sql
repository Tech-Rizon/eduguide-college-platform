-- =============================================================================
-- EduGuide Supabase Database (All In One)
-- =============================================================================
-- This file combines all database migrations into one SQL document.
-- Run in Supabase SQL Editor when you want a full setup from scratch.
--
-- Included migrations:
-- 1) 20260104_create_payments_table.sql
-- 2) 20260105_create_user_and_tutoring_tables.sql
-- 3) 20260106_create_roles_and_dashboard_tables.sql
-- 4) 20260217_normalize_user_roles_and_staff_levels.sql
-- 5) 20260218_backoffice_ticketing_and_auto_assignment.sql
-- 6) 20260219_enterprise_backoffice_hardening.sql
-- 7) 20260225_fix_trigger_security_definer.sql
-- 8) 20260225_add_usernames_to_user_profiles.sql
-- 9) 20260227_referral_and_subscriptions.sql
-- 10) 20260227_checkout_recovery_tracking.sql
-- 11) 20260228_referral_antabuse_and_attributions.sql
--
-- WARNING:
-- - Optional DROP TABLE statements are commented out by default.
-- - Uncomment those lines only if you intentionally want a full data reset.
-- =============================================================================

-- Ensure uuid generator is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1) Payments Table
-- Consolidated section: payments
-- =============================================================================

-- Optional clean reset (disabled by default to preserve data):
-- DROP TABLE IF EXISTS public.payments CASCADE;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  session_id TEXT NOT NULL UNIQUE,
  customer_email TEXT,
  user_id UUID,
  amount INTEGER,
  currency TEXT,
  payment_status TEXT,
  price_id TEXT,
  payment_intent_id TEXT,
  receipt_url TEXT,
  plan TEXT,
  metadata JSONB,
  raw_event JSONB,
  processed BOOLEAN DEFAULT FALSE
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS payments_customer_email_idx ON public.payments (customer_email);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_price_id_idx ON public.payments (price_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments (user_id);

-- Lock it down (recommended)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow only service role to write (deny anonymous/authenticated access)
DROP POLICY IF EXISTS "No direct access for anon/auth" ON public.payments;
CREATE POLICY "No direct access for anon/auth"
  ON public.payments
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

-- Trigger to keep updated_at current on row updates
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_set_updated_at ON public.payments;
CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================================================
-- 1b) Checkout Recovery Tracking
-- Consolidated section: Stripe checkout recovery tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.checkout_recovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_checkout_url TEXT,
  customer_email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan TEXT,
  price_id TEXT,
  referral_code TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'expired')),
  recovery_email_sent_at TIMESTAMPTZ,
  recovery_email_last_attempt_at TIMESTAMPTZ,
  recovery_email_attempts INTEGER NOT NULL DEFAULT 0,
  recovery_email_error TEXT,
  completed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS checkout_recovery_sessions_status_idx
  ON public.checkout_recovery_sessions (status);
CREATE INDEX IF NOT EXISTS checkout_recovery_sessions_created_at_idx
  ON public.checkout_recovery_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS checkout_recovery_sessions_customer_email_idx
  ON public.checkout_recovery_sessions (customer_email);
CREATE INDEX IF NOT EXISTS checkout_recovery_sessions_recovery_email_sent_at_idx
  ON public.checkout_recovery_sessions (recovery_email_sent_at);

ALTER TABLE public.checkout_recovery_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access for anon/auth on checkout recovery" ON public.checkout_recovery_sessions;
CREATE POLICY "No direct access for anon/auth on checkout recovery"
  ON public.checkout_recovery_sessions
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP TRIGGER IF EXISTS checkout_recovery_sessions_set_updated_at ON public.checkout_recovery_sessions;
CREATE TRIGGER checkout_recovery_sessions_set_updated_at
  BEFORE UPDATE ON public.checkout_recovery_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================================================
-- 2) User Profile, Settings, Tutoring Tables
-- Consolidated section: user profiles, settings, tutoring
-- =============================================================================

-- Optional clean reset (disabled by default to preserve data):
-- DROP TABLE IF EXISTS public.tutoring_requests CASCADE;
-- DROP TABLE IF EXISTS public.user_settings CASCADE;
-- DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID NOT NULL PRIMARY KEY,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  marketing_emails BOOLEAN NOT NULL DEFAULT FALSE,
  theme TEXT DEFAULT 'light',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create tutoring_requests table
CREATE TABLE IF NOT EXISTS public.tutoring_requests (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  assigned_tutor_id UUID,
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_requests_user_id ON public.tutoring_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_requests_status ON public.tutoring_requests(status);
CREATE INDEX IF NOT EXISTS idx_tutoring_requests_assigned_tutor_id ON public.tutoring_requests(assigned_tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_requests_created_at ON public.tutoring_requests(created_at DESC);

-- Create function to update updated_at timestamp for user_profiles
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- Create function to update updated_at timestamp for user_settings
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_user_settings_updated_at();

-- Create function to update updated_at timestamp for tutoring_requests
CREATE OR REPLACE FUNCTION public.update_tutoring_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tutoring_requests_updated_at ON public.tutoring_requests;
CREATE TRIGGER update_tutoring_requests_updated_at
BEFORE UPDATE ON public.tutoring_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_tutoring_requests_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutoring_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role bypass" ON public.user_profiles;
CREATE POLICY "Service role bypass" ON public.user_profiles
FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for user_settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" ON public.user_settings
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" ON public.user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role bypass" ON public.user_settings;
CREATE POLICY "Service role bypass" ON public.user_settings
FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for tutoring_requests
DROP POLICY IF EXISTS "Users can view their own tutoring requests" ON public.tutoring_requests;
CREATE POLICY "Users can view their own tutoring requests" ON public.tutoring_requests
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Assigned tutors can view requests" ON public.tutoring_requests;
CREATE POLICY "Assigned tutors can view requests" ON public.tutoring_requests
FOR SELECT USING (auth.uid() = assigned_tutor_id);

DROP POLICY IF EXISTS "Users can create tutoring requests" ON public.tutoring_requests;
CREATE POLICY "Users can create tutoring requests" ON public.tutoring_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tutoring requests" ON public.tutoring_requests;
CREATE POLICY "Users can update their own tutoring requests" ON public.tutoring_requests
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role bypass" ON public.tutoring_requests;
CREATE POLICY "Service role bypass" ON public.tutoring_requests
FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- 3) Enterprise Roles + Dashboard Tables
-- Consolidated section: roles and dashboard tables
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor', 'staff', 'admin')) DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_dashboard_metrics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  colleges_saved INTEGER NOT NULL DEFAULT 0,
  applications_started INTEGER NOT NULL DEFAULT 0,
  scholarships_tracked INTEGER NOT NULL DEFAULT 0,
  tutoring_hours_completed NUMERIC(6,2) NOT NULL DEFAULT 0,
  profile_completion_percent INTEGER NOT NULL DEFAULT 0 CHECK (profile_completion_percent BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_students INTEGER NOT NULL DEFAULT 0,
  open_tickets INTEGER NOT NULL DEFAULT 0,
  sessions_today INTEGER NOT NULL DEFAULT 0,
  completion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_user_id)
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON public.admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_dashboard_updated_at();

DROP TRIGGER IF EXISTS trg_student_dashboard_metrics_updated_at ON public.student_dashboard_metrics;
CREATE TRIGGER trg_student_dashboard_metrics_updated_at
BEFORE UPDATE ON public.student_dashboard_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_dashboard_updated_at();

DROP TRIGGER IF EXISTS trg_staff_dashboard_metrics_updated_at ON public.staff_dashboard_metrics;
CREATE TRIGGER trg_staff_dashboard_metrics_updated_at
BEFORE UPDATE ON public.staff_dashboard_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_dashboard_updated_at();

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to user_roles" ON public.user_roles;
CREATE POLICY "Service role full access to user_roles" ON public.user_roles
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can view own student metrics" ON public.student_dashboard_metrics;
CREATE POLICY "Users can view own student metrics" ON public.student_dashboard_metrics
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to student metrics" ON public.student_dashboard_metrics;
CREATE POLICY "Service role full access to student metrics" ON public.student_dashboard_metrics
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Staff can view own staff metrics" ON public.staff_dashboard_metrics;
CREATE POLICY "Staff can view own staff metrics" ON public.staff_dashboard_metrics
FOR SELECT USING (auth.uid() = staff_user_id);

DROP POLICY IF EXISTS "Service role full access to staff metrics" ON public.staff_dashboard_metrics;
CREATE POLICY "Service role full access to staff metrics" ON public.staff_dashboard_metrics
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to admin logs" ON public.admin_audit_logs;
CREATE POLICY "Service role full access to admin logs" ON public.admin_audit_logs
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- 4) Role Normalization: student|staff + staff_level
-- Consolidated section: role normalization
-- =============================================================================

ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS staff_level TEXT;

-- Backfill from legacy role values (student/tutor/staff/admin).
UPDATE public.user_roles
SET staff_level = CASE
  WHEN role = 'tutor' THEN 'tutor'
  WHEN role = 'staff' THEN 'staff'
  WHEN role = 'admin' THEN 'admin'
  ELSE NULL
END
WHERE staff_level IS NULL;

UPDATE public.user_roles
SET role = CASE
  WHEN role IN ('tutor', 'staff', 'admin') THEN 'staff'
  ELSE role
END;

ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_staff_level_check;

ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_staff_level_required_check;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_role_check
CHECK (role IN ('student', 'staff'));

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_staff_level_check
CHECK (
  staff_level IS NULL
  OR staff_level IN ('tutor', 'staff', 'admin', 'support', 'manager', 'super_admin')
);

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_staff_level_required_check
CHECK (
  (role = 'student' AND staff_level IS NULL)
  OR (role = 'staff' AND staff_level IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_staff_level ON public.user_roles(staff_level);

-- =============================================================================
-- 5) Backoffice Ticketing + Auto Assignment
-- Consolidated section: backoffice ticketing and auto-assignment
-- =============================================================================

ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_staff_level_check;

ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_staff_level_required_check;

-- Normalize legacy values first.
UPDATE public.user_roles
SET role = 'staff'
WHERE staff_level IN ('tutor', 'staff', 'admin', 'support', 'manager', 'super_admin')
  AND role <> 'staff';

UPDATE public.user_roles
SET role = 'student'
WHERE role NOT IN ('student', 'staff');

UPDATE public.user_roles
SET staff_level = NULL
WHERE role = 'student';

UPDATE public.user_roles
SET staff_level = 'support'
WHERE role = 'staff' AND (staff_level = 'staff' OR staff_level IS NULL);

WITH ranked_admins AS (
  SELECT
    user_id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN staff_level = 'super_admin' THEN 0 ELSE 1 END,
        created_at NULLS LAST,
        user_id
    ) AS rank_idx
  FROM public.user_roles
  WHERE role = 'staff'
    AND staff_level IN ('admin', 'super_admin')
)
UPDATE public.user_roles ur
SET staff_level = CASE WHEN ra.rank_idx = 1 THEN 'super_admin' ELSE 'manager' END
FROM ranked_admins ra
WHERE ur.user_id = ra.user_id;

UPDATE public.user_roles
SET staff_level = 'manager'
WHERE role = 'staff'
  AND staff_level NOT IN ('tutor', 'support', 'manager', 'super_admin');

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_staff_level_check
CHECK (
  staff_level IS NULL
  OR staff_level IN ('tutor', 'support', 'manager', 'super_admin')
);

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_staff_level_required_check
CHECK (
  (role = 'student' AND staff_level IS NULL)
  OR (role = 'staff' AND staff_level IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_single_super_admin
ON public.user_roles (staff_level)
WHERE role = 'staff' AND staff_level = 'super_admin';

CREATE TABLE IF NOT EXISTS public.support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  source TEXT NOT NULL DEFAULT 'contact_form',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backoffice_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('tutoring_request', 'support_request', 'manual')),
  source_id UUID,
  student_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_email TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('tutoring', 'support', 'account', 'billing', 'technical', 'general')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_progress', 'waiting_on_student', 'resolved', 'closed')),
  assigned_team TEXT CHECK (assigned_team IN ('tutor', 'support')),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  manager_notes TEXT,
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backoffice_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.backoffice_tickets(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  old_assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  new_assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user ON public.support_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created ON public.support_requests(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_backoffice_tickets_source_unique
ON public.backoffice_tickets(source_type, source_id)
WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_status ON public.backoffice_tickets(status);
CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_priority ON public.backoffice_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_assigned_to ON public.backoffice_tickets(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_assigned_team ON public.backoffice_tickets(assigned_team);
CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_created ON public.backoffice_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_backoffice_ticket_events_ticket ON public.backoffice_ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_backoffice_ticket_events_created ON public.backoffice_ticket_events(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_backoffice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_requests_updated_at ON public.support_requests;
CREATE TRIGGER trg_support_requests_updated_at
BEFORE UPDATE ON public.support_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_backoffice_updated_at();

DROP TRIGGER IF EXISTS trg_backoffice_tickets_updated_at ON public.backoffice_tickets;
CREATE TRIGGER trg_backoffice_tickets_updated_at
BEFORE UPDATE ON public.backoffice_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_backoffice_updated_at();

CREATE OR REPLACE FUNCTION public.create_backoffice_ticket_from_tutoring_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.backoffice_tickets (
    source_type,
    source_id,
    student_user_id,
    title,
    description,
    category,
    priority,
    status,
    assigned_team
  )
  VALUES (
    'tutoring_request',
    NEW.id,
    NEW.user_id,
    CONCAT('Tutoring Request: ', NEW.subject),
    NEW.description,
    'tutoring',
    CASE
      WHEN NEW.priority = 'low' THEN 'low'
      WHEN NEW.priority = 'high' THEN 'high'
      ELSE 'medium'
    END,
    'new',
    'tutor'
  )
  ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tutoring_requests_create_backoffice_ticket ON public.tutoring_requests;
CREATE TRIGGER trg_tutoring_requests_create_backoffice_ticket
AFTER INSERT ON public.tutoring_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_backoffice_ticket_from_tutoring_request();

CREATE OR REPLACE FUNCTION public.create_backoffice_ticket_from_support_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.backoffice_tickets (
    source_type,
    source_id,
    student_user_id,
    requester_email,
    title,
    description,
    category,
    priority,
    status,
    assigned_team
  )
  VALUES (
    'support_request',
    NEW.id,
    NEW.user_id,
    NEW.email,
    CONCAT('Support Request: ', NEW.name),
    NEW.message,
    'support',
    NEW.priority,
    'new',
    'support'
  )
  ON CONFLICT (source_type, source_id) WHERE source_id IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_requests_create_backoffice_ticket ON public.support_requests;
CREATE TRIGGER trg_support_requests_create_backoffice_ticket
AFTER INSERT ON public.support_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_backoffice_ticket_from_support_request();

CREATE OR REPLACE FUNCTION public.auto_assign_backoffice_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  desired_team TEXT;
  chosen_user_id UUID;
BEGIN
  IF NEW.assigned_to_user_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  desired_team := NEW.assigned_team;

  IF desired_team IS NULL THEN
    IF NEW.source_type = 'tutoring_request' OR NEW.category = 'tutoring' THEN
      desired_team := 'tutor';
    ELSE
      desired_team := 'support';
    END IF;
  END IF;

  SELECT ur.user_id
  INTO chosen_user_id
  FROM public.user_roles ur
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS active_count
    FROM public.backoffice_tickets bt
    WHERE bt.assigned_to_user_id = ur.user_id
      AND bt.status IN ('new', 'assigned', 'in_progress', 'waiting_on_student')
  ) workload ON TRUE
  WHERE ur.role = 'staff'
    AND ur.staff_level = desired_team
  ORDER BY COALESCE(workload.active_count, 0), ur.updated_at NULLS LAST, ur.created_at NULLS LAST, ur.user_id
  LIMIT 1;

  IF chosen_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.backoffice_tickets
  SET assigned_to_user_id = chosen_user_id,
      assigned_team = desired_team,
      status = CASE WHEN NEW.status = 'new' THEN 'assigned' ELSE NEW.status END,
      assigned_at = NOW()
  WHERE id = NEW.id;

  INSERT INTO public.backoffice_ticket_events (
    ticket_id,
    actor_user_id,
    action,
    old_status,
    new_status,
    old_assignee_user_id,
    new_assignee_user_id,
    metadata
  )
  VALUES (
    NEW.id,
    NULL,
    'auto_assigned',
    NEW.status,
    'assigned',
    NULL,
    chosen_user_id,
    jsonb_build_object('assigned_team', desired_team)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backoffice_tickets_auto_assign ON public.backoffice_tickets;
CREATE TRIGGER trg_backoffice_tickets_auto_assign
AFTER INSERT ON public.backoffice_tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_backoffice_ticket();

INSERT INTO public.backoffice_tickets (
  source_type,
  source_id,
  student_user_id,
  title,
  description,
  category,
  priority,
  status,
  assigned_team,
  assigned_to_user_id,
  assigned_at
)
SELECT
  'tutoring_request',
  tr.id,
  tr.user_id,
  CONCAT('Tutoring Request: ', tr.subject),
  tr.description,
  'tutoring',
  CASE
    WHEN tr.priority = 'low' THEN 'low'
    WHEN tr.priority = 'high' THEN 'high'
    ELSE 'medium'
  END,
  CASE
    WHEN tr.status = 'assigned' THEN 'assigned'
    WHEN tr.status = 'in_progress' THEN 'in_progress'
    WHEN tr.status = 'completed' THEN 'resolved'
    ELSE 'new'
  END,
  'tutor',
  tr.assigned_tutor_id,
  CASE WHEN tr.assigned_tutor_id IS NOT NULL THEN tr.updated_at ELSE NULL END
FROM public.tutoring_requests tr
WHERE NOT EXISTS (
  SELECT 1
  FROM public.backoffice_tickets bt
  WHERE bt.source_type = 'tutoring_request'
    AND bt.source_id = tr.id
);

INSERT INTO public.backoffice_tickets (
  source_type,
  source_id,
  student_user_id,
  requester_email,
  title,
  description,
  category,
  priority,
  status,
  assigned_team
)
SELECT
  'support_request',
  sr.id,
  sr.user_id,
  sr.email,
  CONCAT('Support Request: ', sr.name),
  sr.message,
  'support',
  sr.priority,
  CASE
    WHEN sr.status = 'in_progress' THEN 'in_progress'
    WHEN sr.status = 'resolved' THEN 'resolved'
    WHEN sr.status = 'closed' THEN 'closed'
    ELSE 'new'
  END,
  'support'
FROM public.support_requests sr
WHERE NOT EXISTS (
  SELECT 1
  FROM public.backoffice_tickets bt
  WHERE bt.source_type = 'support_request'
    AND bt.source_id = sr.id
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backoffice_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backoffice_ticket_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own support requests" ON public.support_requests;
CREATE POLICY "Users can view own support requests" ON public.support_requests
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to support requests" ON public.support_requests;
CREATE POLICY "Service role full access to support requests" ON public.support_requests
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to backoffice tickets" ON public.backoffice_tickets;
CREATE POLICY "Service role full access to backoffice tickets" ON public.backoffice_tickets
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to backoffice ticket events" ON public.backoffice_ticket_events;
CREATE POLICY "Service role full access to backoffice ticket events" ON public.backoffice_ticket_events
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- 6) Enterprise Backoffice Hardening
-- Consolidated section: backoffice hardening
-- =============================================================================

-- Enterprise hardening for backoffice:
-- - Ticket messages + internal notes
-- - SLA due fields + escalation function
-- - Attachment metadata for private signed URL access
-- - Strict RLS for user-scoped staff access
-- - Immutable audit/event rows

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1) Helper functions for RLS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_staff_level()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  level_value TEXT;
BEGIN
  SELECT staff_level
  INTO level_value
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND role = 'staff'
  LIMIT 1;

  RETURN level_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_level() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_level() IN ('manager', 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_staff_level() = 'super_admin'
$$;

CREATE OR REPLACE FUNCTION public.can_access_backoffice_ticket(ticket_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  level_value TEXT;
  assigned_user UUID;
  ticket_assigned_team TEXT;
  student_user UUID;
BEGIN
  level_value := public.current_staff_level();

  SELECT bt.assigned_to_user_id, bt.assigned_team, bt.student_user_id
  INTO assigned_user, ticket_assigned_team, student_user
  FROM public.backoffice_tickets bt
  WHERE bt.id = ticket_uuid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF level_value IN ('manager', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  IF level_value IN ('tutor', 'support') THEN
    RETURN assigned_user = auth.uid() AND ticket_assigned_team = level_value;
  END IF;

  RETURN student_user = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_staff_level() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_backoffice_ticket(UUID) TO authenticated;

-- =============================================================================
-- 2) Ticket SLA + messaging + notes + attachments
-- =============================================================================

ALTER TABLE public.backoffice_tickets
ADD COLUMN IF NOT EXISTS first_response_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS breach_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.backoffice_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.backoffice_tickets(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backoffice_ticket_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.backoffice_tickets(id) ON DELETE CASCADE,
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.backoffice_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.backoffice_tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.backoffice_ticket_messages(id) ON DELETE SET NULL,
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_first_response_due ON public.backoffice_tickets(first_response_due_at);
CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_resolution_due ON public.backoffice_tickets(resolution_due_at);
CREATE INDEX IF NOT EXISTS idx_backoffice_tickets_sensitive ON public.backoffice_tickets(is_sensitive);
CREATE INDEX IF NOT EXISTS idx_backoffice_ticket_messages_ticket ON public.backoffice_ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_backoffice_ticket_internal_notes_ticket ON public.backoffice_ticket_internal_notes(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_backoffice_ticket_attachments_ticket ON public.backoffice_ticket_attachments(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_backoffice_ticket_attachments_message ON public.backoffice_ticket_attachments(message_id);

CREATE OR REPLACE FUNCTION public.apply_backoffice_ticket_sla()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.first_response_due_at IS NULL THEN
    NEW.first_response_due_at := COALESCE(NEW.created_at, NOW()) + CASE NEW.priority
      WHEN 'urgent' THEN INTERVAL '30 minutes'
      WHEN 'high' THEN INTERVAL '2 hours'
      WHEN 'medium' THEN INTERVAL '4 hours'
      ELSE INTERVAL '8 hours'
    END;
  END IF;

  IF NEW.resolution_due_at IS NULL THEN
    NEW.resolution_due_at := COALESCE(NEW.created_at, NOW()) + CASE NEW.priority
      WHEN 'urgent' THEN INTERVAL '8 hours'
      WHEN 'high' THEN INTERVAL '24 hours'
      WHEN 'medium' THEN INTERVAL '48 hours'
      ELSE INTERVAL '72 hours'
    END;
  END IF;

  IF NEW.breach_at IS NULL THEN
    NEW.breach_at := NEW.resolution_due_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backoffice_tickets_apply_sla ON public.backoffice_tickets;
CREATE TRIGGER trg_backoffice_tickets_apply_sla
BEFORE INSERT ON public.backoffice_tickets
FOR EACH ROW
EXECUTE FUNCTION public.apply_backoffice_ticket_sla();

UPDATE public.backoffice_tickets
SET first_response_due_at = created_at + CASE priority
    WHEN 'urgent' THEN INTERVAL '30 minutes'
    WHEN 'high' THEN INTERVAL '2 hours'
    WHEN 'medium' THEN INTERVAL '4 hours'
    ELSE INTERVAL '8 hours'
  END
WHERE first_response_due_at IS NULL;

UPDATE public.backoffice_tickets
SET resolution_due_at = created_at + CASE priority
    WHEN 'urgent' THEN INTERVAL '8 hours'
    WHEN 'high' THEN INTERVAL '24 hours'
    WHEN 'medium' THEN INTERVAL '48 hours'
    ELSE INTERVAL '72 hours'
  END
WHERE resolution_due_at IS NULL;

UPDATE public.backoffice_tickets
SET breach_at = resolution_due_at
WHERE breach_at IS NULL;

CREATE OR REPLACE FUNCTION public.apply_ticket_first_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.visibility = 'public'
     AND EXISTS (
       SELECT 1
       FROM public.user_roles ur
       WHERE ur.user_id = NEW.author_user_id
         AND ur.role = 'staff'
     ) THEN
    UPDATE public.backoffice_tickets
    SET first_response_at = COALESCE(first_response_at, NOW()),
        status = CASE
          WHEN status IN ('new', 'assigned') THEN 'in_progress'
          ELSE status
        END
    WHERE id = NEW.ticket_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_backoffice_ticket_messages_first_response ON public.backoffice_ticket_messages;
CREATE TRIGGER trg_backoffice_ticket_messages_first_response
AFTER INSERT ON public.backoffice_ticket_messages
FOR EACH ROW
EXECUTE FUNCTION public.apply_ticket_first_response();

CREATE OR REPLACE FUNCTION public.escalate_due_backoffice_tickets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  escalated_count INTEGER := 0;
BEGIN
  WITH due_tickets AS (
    SELECT bt.id,
      CASE
        WHEN bt.first_response_at IS NULL
             AND bt.first_response_due_at IS NOT NULL
             AND bt.first_response_due_at <= NOW() + INTERVAL '15 minutes'
          THEN 'first_response_sla_risk'
        ELSE 'resolution_sla_breach'
      END AS next_reason
    FROM public.backoffice_tickets bt
    WHERE bt.status IN ('new', 'assigned', 'in_progress', 'waiting_on_student')
      AND (
        (bt.first_response_at IS NULL AND bt.first_response_due_at IS NOT NULL AND bt.first_response_due_at <= NOW() + INTERVAL '15 minutes')
        OR (bt.resolution_due_at IS NOT NULL AND bt.resolution_due_at <= NOW())
      )
      AND (bt.escalated_at IS NULL OR bt.escalated_at < NOW() - INTERVAL '30 minutes')
  ),
  updated AS (
    UPDATE public.backoffice_tickets bt
    SET escalated_at = NOW(),
        escalation_reason = due_tickets.next_reason
    FROM due_tickets
    WHERE bt.id = due_tickets.id
    RETURNING bt.id, bt.status, due_tickets.next_reason
  )
  INSERT INTO public.backoffice_ticket_events (
    ticket_id,
    actor_user_id,
    action,
    old_status,
    new_status,
    metadata
  )
  SELECT
    u.id,
    NULL,
    'sla_escalated',
    u.status,
    u.status,
    jsonb_build_object('reason', u.next_reason)
  FROM updated u;

  GET DIAGNOSTICS escalated_count = ROW_COUNT;
  RETURN escalated_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_audit_row_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit/event rows are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_audit_logs_immutable ON public.admin_audit_logs;
CREATE TRIGGER trg_admin_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_row_mutation();

DROP TRIGGER IF EXISTS trg_backoffice_ticket_events_immutable ON public.backoffice_ticket_events;
CREATE TRIGGER trg_backoffice_ticket_events_immutable
BEFORE UPDATE OR DELETE ON public.backoffice_ticket_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_audit_row_mutation();

-- Private attachment bucket for signed URL access.
INSERT INTO storage.buckets (id, name, public)
VALUES ('backoffice-attachments', 'backoffice-attachments', FALSE)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- =============================================================================
-- 3) RLS hardening (user-scoped staff clients)
-- =============================================================================

ALTER TABLE public.backoffice_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backoffice_ticket_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backoffice_ticket_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to support requests" ON public.support_requests;
DROP POLICY IF EXISTS "Service role full access to backoffice tickets" ON public.backoffice_tickets;
DROP POLICY IF EXISTS "Service role full access to backoffice ticket events" ON public.backoffice_ticket_events;

DROP POLICY IF EXISTS "Users can create own support requests" ON public.support_requests;
CREATE POLICY "Users can create own support requests" ON public.support_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Staff can view support requests" ON public.support_requests;
CREATE POLICY "Staff can view support requests" ON public.support_requests
FOR SELECT
USING (public.is_staff_user());

DROP POLICY IF EXISTS "Staff can update support requests" ON public.support_requests;
CREATE POLICY "Staff can update support requests" ON public.support_requests
FOR UPDATE
USING (public.is_staff_user())
WITH CHECK (public.is_staff_user());

DROP POLICY IF EXISTS "Staff and students can view permitted tickets" ON public.backoffice_tickets;
CREATE POLICY "Staff and students can view permitted tickets" ON public.backoffice_tickets
FOR SELECT
USING (public.can_access_backoffice_ticket(id));

DROP POLICY IF EXISTS "Managers can create manual tickets" ON public.backoffice_tickets;
CREATE POLICY "Managers can create manual tickets" ON public.backoffice_tickets
FOR INSERT
WITH CHECK (public.is_manager_or_super_admin());

DROP POLICY IF EXISTS "Staff can update permitted tickets" ON public.backoffice_tickets;
CREATE POLICY "Staff can update permitted tickets" ON public.backoffice_tickets
FOR UPDATE
USING (public.is_staff_user() AND public.can_access_backoffice_ticket(id))
WITH CHECK (public.is_staff_user() AND public.can_access_backoffice_ticket(id));

DROP POLICY IF EXISTS "Staff can view permitted ticket events" ON public.backoffice_ticket_events;
CREATE POLICY "Staff can view permitted ticket events" ON public.backoffice_ticket_events
FOR SELECT
USING (public.can_access_backoffice_ticket(ticket_id));

DROP POLICY IF EXISTS "Staff can insert ticket events" ON public.backoffice_ticket_events;
CREATE POLICY "Staff can insert ticket events" ON public.backoffice_ticket_events
FOR INSERT
WITH CHECK (
  public.is_staff_user()
  AND actor_user_id = auth.uid()
  AND public.can_access_backoffice_ticket(ticket_id)
);

DROP POLICY IF EXISTS "Users can view allowed ticket messages" ON public.backoffice_ticket_messages;
CREATE POLICY "Users can view allowed ticket messages" ON public.backoffice_ticket_messages
FOR SELECT
USING (
  (
    visibility = 'public'
    AND public.can_access_backoffice_ticket(ticket_id)
  )
  OR (
    visibility = 'internal'
    AND public.is_staff_user()
    AND public.can_access_backoffice_ticket(ticket_id)
  )
);

DROP POLICY IF EXISTS "Users can insert allowed ticket messages" ON public.backoffice_ticket_messages;
CREATE POLICY "Users can insert allowed ticket messages" ON public.backoffice_ticket_messages
FOR INSERT
WITH CHECK (
  public.can_access_backoffice_ticket(ticket_id)
  AND author_user_id = auth.uid()
  AND (
    (public.is_staff_user() AND visibility IN ('public', 'internal'))
    OR (NOT public.is_staff_user() AND visibility = 'public')
  )
);

DROP POLICY IF EXISTS "Staff can view internal notes" ON public.backoffice_ticket_internal_notes;
CREATE POLICY "Staff can view internal notes" ON public.backoffice_ticket_internal_notes
FOR SELECT
USING (public.is_staff_user() AND public.can_access_backoffice_ticket(ticket_id));

DROP POLICY IF EXISTS "Staff can insert internal notes" ON public.backoffice_ticket_internal_notes;
CREATE POLICY "Staff can insert internal notes" ON public.backoffice_ticket_internal_notes
FOR INSERT
WITH CHECK (
  public.is_staff_user()
  AND staff_user_id = auth.uid()
  AND public.can_access_backoffice_ticket(ticket_id)
);

DROP POLICY IF EXISTS "Users can view ticket attachments" ON public.backoffice_ticket_attachments;
CREATE POLICY "Users can view ticket attachments" ON public.backoffice_ticket_attachments
FOR SELECT
USING (public.can_access_backoffice_ticket(ticket_id));

DROP POLICY IF EXISTS "Users can insert ticket attachments" ON public.backoffice_ticket_attachments;
CREATE POLICY "Users can insert ticket attachments" ON public.backoffice_ticket_attachments
FOR INSERT
WITH CHECK (
  uploaded_by_user_id = auth.uid()
  AND public.can_access_backoffice_ticket(ticket_id)
);

DROP POLICY IF EXISTS "Managers can view staff roles" ON public.user_roles;
CREATE POLICY "Managers can view staff roles" ON public.user_roles
FOR SELECT
USING (public.is_manager_or_super_admin() AND role = 'staff');

DROP POLICY IF EXISTS "Service role full access to support requests" ON public.support_requests;
CREATE POLICY "Service role full access to support requests" ON public.support_requests
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to backoffice tickets" ON public.backoffice_tickets;
CREATE POLICY "Service role full access to backoffice tickets" ON public.backoffice_tickets
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to backoffice ticket events" ON public.backoffice_ticket_events;
CREATE POLICY "Service role full access to backoffice ticket events" ON public.backoffice_ticket_events
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to ticket messages" ON public.backoffice_ticket_messages;
CREATE POLICY "Service role full access to ticket messages" ON public.backoffice_ticket_messages
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to ticket internal notes" ON public.backoffice_ticket_internal_notes;
CREATE POLICY "Service role full access to ticket internal notes" ON public.backoffice_ticket_internal_notes
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access to ticket attachments" ON public.backoffice_ticket_attachments;
CREATE POLICY "Service role full access to ticket attachments" ON public.backoffice_ticket_attachments
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =============================================================================
-- 7) Usernames for Student Profiles
-- Consolidated section: usernames on user profiles
-- =============================================================================

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Normalize existing values if the column already existed in a prior local version.
UPDATE public.user_profiles
SET username = NULLIF(LOWER(TRIM(username)), '')
WHERE username IS DISTINCT FROM NULLIF(LOWER(TRIM(username)), '');

ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_username_format_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_username_format_check
CHECK (
  username IS NULL
  OR username ~ '^[a-z0-9_]{3,30}$'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username_unique
ON public.user_profiles (LOWER(username))
WHERE username IS NOT NULL;

-- =============================================================================
-- 8) Referral Program & Subscriptions
-- Consolidated section: referrals and subscriptions
-- =============================================================================

-- referral_codes: one row per student — their unique shareable code
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code       TEXT        NOT NULL UNIQUE,
  clicks     INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_codes_code_idx    ON public.referral_codes (code);
CREATE INDEX IF NOT EXISTS referral_codes_user_id_idx ON public.referral_codes (user_id);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referral code" ON public.referral_codes;
CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "No direct write for anon/auth on referral_codes" ON public.referral_codes;
CREATE POLICY "No direct write for anon/auth on referral_codes"
  ON public.referral_codes FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

-- referrals: tracks each referral event
CREATE TABLE IF NOT EXISTS public.referrals (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referee_email      TEXT,
  referee_user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  code               TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'pending',
  stripe_session_id  TEXT,
  reward_coupon_id   TEXT,
  reward_expires_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  converted_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx        ON public.referrals (code);
CREATE INDEX IF NOT EXISTS referrals_status_idx      ON public.referrals (status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "No direct write for anon/auth on referrals" ON public.referrals;
CREATE POLICY "No direct write for anon/auth on referrals"
  ON public.referrals FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

-- subscriptions: mirrors Stripe subscription state per user
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT        UNIQUE,
  plan                   TEXT,
  status                 TEXT,
  current_period_end     TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN     NOT NULL DEFAULT FALSE,
  price_id               TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx                ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx     ON public.subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON public.subscriptions (stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "No direct write for anon/auth on subscriptions" ON public.subscriptions;
CREATE POLICY "No direct write for anon/auth on subscriptions"
  ON public.subscriptions FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- =============================================================================
-- 9) Referral Anti-Abuse Hold + Attribution Tracking
-- Consolidated section: referral hold columns and referral_attributions
-- =============================================================================

-- Add hold-tracking columns and subscription linkage to referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS qualified_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rewarded_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_stripe_session_id_unique;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_stripe_session_id_unique UNIQUE (stripe_session_id);

CREATE INDEX IF NOT EXISTS referrals_stripe_subscription_id_idx
  ON public.referrals (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS referrals_qualified_at_idx
  ON public.referrals (qualified_at)
  WHERE qualified_at IS NOT NULL;

-- referral_attributions: tracks each unique landing-page visit via a ref link
CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code    TEXT        NOT NULL,
  referrer_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id       TEXT,
  landing_url      TEXT,
  utm_source       TEXT,
  utm_medium       TEXT,
  utm_campaign     TEXT,
  ip_hash          TEXT,
  user_agent_hash  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_attributions_code_idx
  ON public.referral_attributions (referral_code);
CREATE INDEX IF NOT EXISTS referral_attributions_visitor_id_idx
  ON public.referral_attributions (visitor_id)
  WHERE visitor_id IS NOT NULL;

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access to referral_attributions"
  ON public.referral_attributions;
CREATE POLICY "Service role full access to referral_attributions"
  ON public.referral_attributions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RPC for atomic click increment
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

-- =============================================================================
-- End of all-in-one Supabase database script.
-- =============================================================================
