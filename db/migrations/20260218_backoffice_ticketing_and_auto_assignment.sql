-- Enterprise backoffice ticketing, auto-assignment, and staff hierarchy expansion.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1) Expand staff levels to support/tutor/manager/super_admin
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

-- Exactly one super admin at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_single_super_admin
ON public.user_roles (staff_level)
WHERE role = 'staff' AND staff_level = 'super_admin';

-- =============================================================================
-- 2) Backoffice request/ticket tables
-- =============================================================================

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

-- =============================================================================
-- 3) Auto-ticket creation + auto-assignment
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_backoffice_ticket_from_tutoring_request()
RETURNS TRIGGER AS $$
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
  ON CONFLICT (source_type, source_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tutoring_requests_create_backoffice_ticket ON public.tutoring_requests;
CREATE TRIGGER trg_tutoring_requests_create_backoffice_ticket
AFTER INSERT ON public.tutoring_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_backoffice_ticket_from_tutoring_request();

CREATE OR REPLACE FUNCTION public.create_backoffice_ticket_from_support_request()
RETURNS TRIGGER AS $$
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
  ON CONFLICT (source_type, source_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_requests_create_backoffice_ticket ON public.support_requests;
CREATE TRIGGER trg_support_requests_create_backoffice_ticket
AFTER INSERT ON public.support_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_backoffice_ticket_from_support_request();

CREATE OR REPLACE FUNCTION public.auto_assign_backoffice_ticket()
RETURNS TRIGGER AS $$
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
      status = CASE WHEN status = 'new' THEN 'assigned' ELSE status END,
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_backoffice_tickets_auto_assign ON public.backoffice_tickets;
CREATE TRIGGER trg_backoffice_tickets_auto_assign
AFTER INSERT ON public.backoffice_tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_backoffice_ticket();

-- Backfill existing tutoring requests into ticket queue.
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

-- Backfill existing support requests if they exist.
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

-- =============================================================================
-- 4) Security policies
-- =============================================================================

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
