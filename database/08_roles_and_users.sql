-- ============================================================
--  08_roles_and_users.sql
--  Étendre les rôles + créer les comptes TORTITRACK
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Étendre le CHECK des rôles ──────────────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (role IN (
    'dg',
    'gm',
    'admin',
    'production_manager',
    'chef_usine',
    'quality',
    'logistics',
    'sales',
    'commercial',
    'dir_commercial',
    'chef_commercial',
    'finance',
    'acheteur',
    'chef_rh',
    'agent_rh',
    'operator'
  ));

-- ── 2. Créer les utilisateurs de démonstration ─────────────────
--  Remplacez les mots de passe par vos vraies valeurs.
--  Ces INSERTs sont idempotents (ON CONFLICT DO NOTHING).

DO $$
DECLARE
  uid UUID;
  users_data RECORD;
BEGIN
  -- Tableau des utilisateurs à créer
  FOR users_data IN
    SELECT * FROM (VALUES
      ('dg@tortitrack.tn',        'TortiDG2026!',     'Ali Mansour',       'dg'),
      ('com@tortitrack.tn',        'TortiCom2026!',    'Sonia Kamoun',      'commercial'),
      ('usine@tortitrack.tn',      'TortiUsine2026!',  'Karim Ben Ali',     'chef_usine'),
      ('qualite@tortitrack.tn',    'TortiQA2026!',     'Amina Rezgui',      'quality'),
      ('finance@tortitrack.tn',    'TortiFin2026!',    'Hedi Zarrouk',      'finance'),
      ('acheteur@tortitrack.tn',   'TortiAch2026!',    'Leila Bchir',       'acheteur'),
      ('dircom@tortitrack.tn',     'TortiDir2026!',    'Ahmed Belhaj',      'dir_commercial'),
      ('rh@tortitrack.tn',         'TortiRH2026!',     'Mariem Trabelsi',   'chef_rh'),
      ('logistique@tortitrack.tn', 'TortiLog2026!',    'Riadh Hamdi',       'logistics'),
      ('operateur@tortitrack.tn',  'TortiOp2026!',     'Jamel Gharbi',      'operator')
    ) AS t(email, password, full_name, role)
  LOOP
    -- Check if user already exists in auth
    SELECT id INTO uid FROM auth.users WHERE email = users_data.email;

    IF uid IS NULL THEN
      -- Create the auth user
      uid := gen_random_uuid();
      INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) VALUES (
        uid,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        users_data.email,
        crypt(users_data.password, gen_salt('bf')),
        NOW(),
        jsonb_build_object('full_name', users_data.full_name, 'role', users_data.role),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      );
    END IF;

    -- Upsert the profile
    INSERT INTO public.user_profiles (id, full_name, email, role, is_active, created_at, updated_at)
    VALUES (uid, users_data.full_name, users_data.email, users_data.role, true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      full_name  = EXCLUDED.full_name,
      role       = EXCLUDED.role,
      is_active  = true,
      updated_at = NOW();

  END LOOP;
END $$;

-- ── 3. Vérification ────────────────────────────────────────────
SELECT
  au.email,
  up.full_name,
  up.role,
  up.is_active,
  au.created_at
FROM auth.users au
JOIN public.user_profiles up ON up.id = au.id
WHERE au.email LIKE '%@tortitrack.tn'
ORDER BY au.email;
