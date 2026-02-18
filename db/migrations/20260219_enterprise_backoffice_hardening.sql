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
  assigned_team TEXT;
  student_user UUID;
BEGIN
  level_value := public.current_staff_level();

  SELECT assigned_to_user_id, assigned_team, student_user_id
  INTO assigned_user, assigned_team, student_user
  FROM public.backoffice_tickets
  WHERE id = ticket_uuid;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF level_value IN ('manager', 'super_admin') THEN
    RETURN TRUE;
  END IF;

  IF level_value IN ('tutor', 'support') THEN
    RETURN assigned_user = auth.uid() AND assigned_team = level_value;
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
