-- ============================================================
--  13_fix_stock_camion.sql — Colonnes complémentaires
--  + table demandes_chargement
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- ── stock_camion : colonnes manquantes ───────────────────────
ALTER TABLE stock_camion ADD COLUMN IF NOT EXISTS qte_physique  NUMERIC(12,3);
ALTER TABLE stock_camion ADD COLUMN IF NOT EXISTS status_qc     TEXT DEFAULT 'ok';
ALTER TABLE stock_camion ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE stock_camion ADD COLUMN IF NOT EXISTS dlc           DATE;

-- ── demandes_chargement ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS demandes_chargement (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number       TEXT UNIQUE NOT NULL,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicule     TEXT,
  vehicule_id  TEXT,
  conducteur   TEXT,
  total_pcs    INTEGER DEFAULT 0,
  total_kg     NUMERIC(10,3) DEFAULT 0,
  taux_kg      INTEGER DEFAULT 0,
  notes        TEXT,
  status       TEXT DEFAULT 'confirmé',
  created_by   TEXT,
  operator_id  UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE demandes_chargement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dc_all" ON demandes_chargement;
CREATE POLICY "dc_all" ON demandes_chargement FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── user_profiles : RLS permissive pour la vue Utilisateurs ──
-- Permet à DG de lire et modifier tous les profils
DROP POLICY IF EXISTS "profiles_read_all"   ON user_profiles;
DROP POLICY IF EXISTS "profiles_update_all" ON user_profiles;

CREATE POLICY "profiles_read_all" ON user_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_update_all" ON user_profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
