-- ============================================================
--  07_user_profiles.sql — Standardiser la table user_profiles
--  Exécuter dans : Supabase Dashboard → SQL Editor
--  But: this migration is idempotent and safe to re-run.
-- ============================================================

-- Create table if not exists with canonical columns
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'operator',
  vendor_id UUID REFERENCES vendors(id),
  phone TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Make email unique (case-insensitive) if possible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relname = 'idx_user_profiles_email'
  ) THEN
    CREATE UNIQUE INDEX idx_user_profiles_email ON public.user_profiles (lower(email));
  END IF;
END$$;

-- Ensure role CHECK contains expected roles
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (
  role IN ('dg','production_manager','quality','logistics','sales','finance','operator','gm','admin')
);

-- Add missing columns safely (no-op if exists)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.fn_user_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER tg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_user_profiles_updated_at();

-- Create/replace trigger that populates a profile when an auth user is created
CREATE OR REPLACE FUNCTION public.fn_create_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  meta jsonb;
  preferred_name text;
  preferred_role text;
BEGIN
  -- auth.users only exposes raw_user_meta_data (user_metadata does not exist on the trigger record)
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  preferred_name := COALESCE(meta->>'full_name', NEW.email, '');
  preferred_role := COALESCE(meta->>'role', 'operator');

  INSERT INTO public.user_profiles (id, full_name, email, role, metadata, created_at, updated_at)
  VALUES (NEW.id, preferred_name, NEW.email, preferred_role, meta, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_user_profile();

-- Enable Row Level Security and policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any and (re)create safe defaults
DROP POLICY IF EXISTS profiles_select ON public.user_profiles;
DROP POLICY IF EXISTS profiles_insert ON public.user_profiles;
DROP POLICY IF EXISTS profiles_update ON public.user_profiles;
DROP POLICY IF EXISTS profiles_delete ON public.user_profiles;

-- Select: any authenticated user can read profiles (adjust if you want stricter)
CREATE POLICY profiles_select ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

-- Insert: allow only the authenticated user to create their own profile row
CREATE POLICY profiles_insert ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Update: allow user to update own profile OR users with admin/gm/dg roles to update any
CREATE POLICY profiles_update ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('dg','gm','admin'))
  )
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role IN ('dg','gm','admin'))
  );

-- Delete: only admin can delete
CREATE POLICY profiles_delete ON public.user_profiles
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.role = 'admin')
  );

-- Maintain compatibility: ensure existing rows have an email value (if missing)
UPDATE public.user_profiles SET email = (SELECT email FROM auth.users WHERE auth.users.id = public.user_profiles.id) WHERE email IS NULL;

-- Done
COMMENT ON TABLE public.user_profiles IS 'Canonical user profiles table (id references auth.users)';
