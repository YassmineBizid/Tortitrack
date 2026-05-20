-- ============================================================
--  06_roles.sql — Migration: étendre la liste des rôles permis
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- Supprime la contrainte CHECK existante si nommée automatiquement
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Ajoute une contrainte explicite avec les nouveaux rôles
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (
  role IN (
    'dg', 'production_manager', 'quality', 'logistics', 'sales', 'finance', 'operator', 'gm', 'admin'
  )
);

-- Mettre à jour les lignes existantes qui pourraient avoir d'anciens rôles (sécuritaire)
UPDATE user_profiles SET role = 'operator' WHERE role IS NULL OR role = '';

-- Note: si votre projet utilise une autre contrainte nommée, la commande DROP CONSTRAINT IF EXISTS ne lèvera pas d'erreur.
