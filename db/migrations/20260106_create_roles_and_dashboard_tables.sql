-- Enterprise roles + dashboard support tables

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
