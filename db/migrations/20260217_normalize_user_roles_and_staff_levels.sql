-- Normalize user roles into top-level role + staff level hierarchy.
-- Target model:
--   role: student | staff
--   staff_level (nullable for students): tutor | staff | admin

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
  OR staff_level IN ('tutor', 'staff', 'admin')
);

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_staff_level_required_check
CHECK (
  (role = 'student' AND staff_level IS NULL)
  OR (role = 'staff' AND staff_level IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_staff_level ON public.user_roles(staff_level);
