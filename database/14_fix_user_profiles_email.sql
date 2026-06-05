-- ============================================================
--  14_fix_user_profiles_email.sql
--  Ajoute la colonne email à user_profiles si absente
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ajouter la colonne email si elle n'existe pas
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Remplir email depuis auth.users pour les lignes existantes
UPDATE public.user_profiles p
SET email = a.email
FROM auth.users a
WHERE p.id = a.id
  AND p.email IS NULL;

-- 3. Ajouter la colonne metadata si absente
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Ajouter is_active si absente
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 5. Mettre à jour le trigger de création pour inclure l'email
CREATE OR REPLACE FUNCTION public.fn_create_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, role, is_active, metadata)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator'),
    true,
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    email    = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_create_user_profile ON auth.users;
CREATE TRIGGER tg_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_user_profile();
