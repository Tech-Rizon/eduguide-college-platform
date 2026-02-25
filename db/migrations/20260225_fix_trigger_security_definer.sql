-- =============================================================================
-- Migration: Fix trigger SECURITY DEFINER
-- Date: 2026-02-25
-- =============================================================================
-- Problem: auto_assign_backoffice_ticket and apply_ticket_first_response were
-- missing SECURITY DEFINER, causing them to run in the session user's security
-- context. This led to:
--   1) "column reference 'assigned_team' is ambiguous" when the trigger ran
--      inside a LATERAL JOIN that also referenced backoffice_tickets via RLS
--   2) RLS policies blocking the trigger's internal UPDATE on backoffice_tickets
--      when the calling session was a student (not staff).
--
-- Fix: Add SECURITY DEFINER + SET search_path = public to both trigger functions
-- so they always run with the function owner's privileges (bypassing RLS), which
-- is the correct behaviour for system-level auto-assignment operations.
--
-- Also: use NEW.status in the CASE expression to be explicit about which row's
-- status value is referenced (avoids any column-reference ambiguity with the
-- backoffice_tickets target table column of the same name).
-- =============================================================================

-- Fix 1: auto_assign_backoffice_ticket
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

-- Fix 2: apply_ticket_first_response
-- This trigger updates backoffice_tickets when a staff member posts the first
-- public reply. Without SECURITY DEFINER it could fail when the student's
-- session triggers it (student can't update backoffice_tickets via RLS).
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
