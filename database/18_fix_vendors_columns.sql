-- ============================================================
--  18_fix_vendors_columns.sql
--  Ajoute les colonnes manquantes à la table vendors,
--  crée les tables brands et zones si elles n'existent pas,
--  et corrige les politiques RLS pour inclure le rôle 'dg'.
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tables brands et zones (si non créées via dashboard) ─────
CREATE TABLE IF NOT EXISTS brands (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS brands / zones
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_all" ON brands;
DROP POLICY IF EXISTS "zones_all"  ON zones;

CREATE POLICY "brands_all" ON brands FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "zones_all"  ON zones  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Colonnes manquantes sur vendors ──────────────────────────
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS brand_id        UUID REFERENCES brands(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_id         UUID REFERENCES zones(id)         ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_id      UUID REFERENCES flotte(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL;

-- ── Correction RLS vendors : inclure le rôle 'dg' ────────────
DROP POLICY IF EXISTS "vendors_write" ON vendors;

CREATE POLICY "vendors_write" ON vendors FOR ALL TO authenticated
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid())
    IN ('gm', 'admin', 'dg')
  )
  WITH CHECK (
    (SELECT role FROM user_profiles WHERE id = auth.uid())
    IN ('gm', 'admin', 'dg')
  );
