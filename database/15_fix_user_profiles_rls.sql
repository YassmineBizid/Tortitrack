-- ============================================================
--  15_fix_user_profiles_rls.sql
--  Corrections RLS + colonnes manquantes sur user_profiles
--  Exécuter dans : Supabase Dashboard → SQL Editor
--
--  IMPORTANT : exécuter en 2 étapes si erreur sur ALTER TYPE :
--    Étape 1 = section "ÉTAPE 1" ci-dessous
--    Étape 2 = section "ÉTAPE 2" ci-dessous
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 1 : Ajouter les valeurs à l'enum user_role
--           (À exécuter SEUL si la colonne role est de type enum)
-- ══════════════════════════════════════════════════════════════
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'chef_usine';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'commercial';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'dir_commercial';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'chef_commercial';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'acheteur';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'chef_rh';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'agent_rh';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'production_manager';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'dg';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'gm';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'quality';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'logistics';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'operator';

-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 2 : Colonnes, RLS, trigger
-- ══════════════════════════════════════════════════════════════

-- Ajouter les colonnes manquantes
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email     TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS metadata  JSONB    DEFAULT '{}'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN  DEFAULT true;

-- Remplir email depuis auth.users pour les lignes existantes
UPDATE public.user_profiles p
SET    email = a.email
FROM   auth.users a
WHERE  p.id = a.id
  AND  (p.email IS NULL OR p.email = '');

-- Activer RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer et recréer toutes les politiques
DROP POLICY IF EXISTS "profiles_read_all"    ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_all"  ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_insert_all"  ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_delete_all"  ON public.user_profiles;

CREATE POLICY "profiles_read_all"   ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_all" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles_update_all" ON public.user_profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "profiles_delete_all" ON public.user_profiles
  FOR DELETE TO authenticated USING (true);

-- Recréer le trigger de création utilisateur
CREATE OR REPLACE FUNCTION public.fn_create_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');
  IF v_role NOT IN ('dg','gm','admin','production_manager','chef_usine',
                    'quality','logistics','sales','commercial','dir_commercial',
                    'chef_commercial','finance','acheteur','chef_rh','agent_rh','operator')
  THEN
    v_role := 'operator';
  END IF;

  INSERT INTO public.user_profiles (id, full_name, email, role, is_active, metadata)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role,
    true,
    COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(NULLIF(EXCLUDED.full_name,''), public.user_profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_create_user_profile error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created   ON auth.users;
DROP TRIGGER IF EXISTS tg_create_user_profile ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_user_profile();

-- Vérification finale
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles' ORDER BY cmd;


-- 2. Ajouter les colonnes manquantes
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email     TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS metadata  JSONB    DEFAULT '{}'::jsonb;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN  DEFAULT true;

-- 3. Remplir email depuis auth.users pour les lignes existantes
UPDATE public.user_profiles p
SET    email = a.email
FROM   auth.users a
WHERE  p.id = a.id
  AND  (p.email IS NULL OR p.email = '');

-- 4. Activer RLS sur user_profiles (idempotent)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer et recréer toutes les politiques
DROP POLICY IF EXISTS "profiles_read_all"    ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_update_all"  ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_insert_all"  ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_delete_all"  ON public.user_profiles;

CREATE POLICY "profiles_read_all"   ON public.user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert_all" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "profiles_update_all" ON public.user_profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "profiles_delete_all" ON public.user_profiles
  FOR DELETE TO authenticated USING (true);

-- 6. Recréer le trigger de création utilisateur
--    Cast vers user_role si c'est un enum, sinon TEXT direct
CREATE OR REPLACE FUNCTION public.fn_create_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT;
  v_is_enum BOOLEAN;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'operator');

  -- Valider le rôle
  IF v_role NOT IN ('dg','gm','admin','production_manager','chef_usine',
                    'quality','logistics','sales','commercial','dir_commercial',
                    'chef_commercial','finance','acheteur','chef_rh','agent_rh','operator')
  THEN
    v_role := 'operator';
  END IF;

  -- Vérifier si la colonne role est un enum
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns c
    JOIN pg_type t ON t.typname = c.udt_name
    WHERE c.table_schema = 'public'
      AND c.table_name   = 'user_profiles'
      AND c.column_name  = 'role'
      AND t.typtype      = 'e'
  ) INTO v_is_enum;

  IF v_is_enum THEN
    -- Insérer avec cast vers l'enum
    EXECUTE format(
      'INSERT INTO public.user_profiles (id, full_name, email, role, is_active, metadata)
       VALUES ($1, $2, $3, $4::public.user_role, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         email     = EXCLUDED.email,
         full_name = COALESCE(NULLIF(EXCLUDED.full_name,''''), public.user_profiles.full_name),
         updated_at = NOW()'
    ) USING NEW.id,
             COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
             NEW.email,
             v_role,
             true,
             COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  ELSE
    INSERT INTO public.user_profiles (id, full_name, email, role, is_active, metadata)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      v_role,
      true,
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb)
    )
    ON CONFLICT (id) DO UPDATE SET
      email      = EXCLUDED.email,
      full_name  = COALESCE(NULLIF(EXCLUDED.full_name,''), public.user_profiles.full_name),
      updated_at = NOW();
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_create_user_profile error: %', SQLERRM;
  RETURN NEW;  -- Ne jamais bloquer la création du compte Auth
END;
$$;

-- 7. Remplacer les deux triggers possibles
DROP TRIGGER IF EXISTS on_auth_user_created   ON auth.users;
DROP TRIGGER IF EXISTS tg_create_user_profile ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_create_user_profile();

-- 8. Vérification finale
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'user_profiles' ORDER BY cmd;


