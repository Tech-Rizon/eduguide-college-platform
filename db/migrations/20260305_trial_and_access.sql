-- =============================================================================
-- Trial Period + Access Gating (migration 20260305)
-- Adds trial_started_at to user_profiles and auto-sets it on registration
-- =============================================================================

-- 1. Add trial_started_at column
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- 2. Trigger function: auto-create/update user_profiles on new auth.users row
--    SECURITY DEFINER so it can write to public.user_profiles from the auth schema context
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, trial_started_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO UPDATE
    SET trial_started_at = COALESCE(public.user_profiles.trial_started_at, NOW());
  RETURN NEW;
END;
$$;

-- 3. Attach trigger to auth.users (runs after each new user is created)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Backfill existing profiles: use their profile created_at as trial start
--    This gives existing users a fair trial window from when they first created a profile
UPDATE public.user_profiles
  SET trial_started_at = created_at
  WHERE trial_started_at IS NULL;
