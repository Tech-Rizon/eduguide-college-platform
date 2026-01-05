-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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

-- Create trigger for user_profiles updated_at
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

-- Create trigger for user_settings updated_at
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

-- Create trigger for tutoring_requests updated_at
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
-- Users can view all public profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
FOR SELECT USING (true);

-- Users can update only their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for user_settings
-- Users can view only their own settings
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings" ON public.user_settings
FOR SELECT USING (auth.uid() = user_id);

-- Users can update only their own settings
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings" ON public.user_settings
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can insert their own settings
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings" ON public.user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tutoring_requests
-- Users can view their own requests
DROP POLICY IF EXISTS "Users can view their own tutoring requests" ON public.tutoring_requests;
CREATE POLICY "Users can view their own tutoring requests" ON public.tutoring_requests
FOR SELECT USING (auth.uid() = user_id);

-- Tutors can view requests assigned to them
DROP POLICY IF EXISTS "Assigned tutors can view requests" ON public.tutoring_requests;
CREATE POLICY "Assigned tutors can view requests" ON public.tutoring_requests
FOR SELECT USING (auth.uid() = assigned_tutor_id);

-- Users can create requests
DROP POLICY IF EXISTS "Users can create tutoring requests" ON public.tutoring_requests;
CREATE POLICY "Users can create tutoring requests" ON public.tutoring_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests
DROP POLICY IF EXISTS "Users can update their own tutoring requests" ON public.tutoring_requests;
CREATE POLICY "Users can update their own tutoring requests" ON public.tutoring_requests
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can update any request (assign tutors, change status)
-- This assumes there's a custom claim for admin role
DROP POLICY IF EXISTS "Admins can manage all tutoring requests" ON public.tutoring_requests;
CREATE POLICY "Admins can manage all tutoring requests" ON public.tutoring_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND email LIKE '%@admin%' -- Simple check; adjust as needed
  )
);
