-- Add username support to user profiles for student-facing profile completion flows.

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS username TEXT;

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
