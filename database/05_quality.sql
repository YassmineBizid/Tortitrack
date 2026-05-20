-- ============================================================
--  05_quality.sql — Module Contrôle Qualité
--  MP (Matières Premières), PF (Produits Finis), Retours
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- ── TABLE CONTRÔLES QUALITÉ ──────────────────────────────────
CREATE TABLE IF NOT EXISTS quality_checks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          TEXT NOT NULL CHECK (type IN ('MP', 'PF', 'retour')),
  product_ref   TEXT,
  product_name  TEXT NOT NULL,
  lot_number    TEXT,
  quantity      NUMERIC(10,3),
  status        TEXT NOT NULL DEFAULT 'en_attente'
                  CHECK (status IN ('conforme','en_attente','bloqué','libéré','déclassé','détruit')),
  notes         TEXT,
  checked_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour filtrer par type et statut rapidement
CREATE INDEX IF NOT EXISTS idx_qc_type   ON quality_checks(type);
CREATE INDEX IF NOT EXISTS idx_qc_status ON quality_checks(status);
CREATE INDEX IF NOT EXISTS idx_qc_date   ON quality_checks(created_at DESC);

-- Trigger : updated_at automatique
CREATE OR REPLACE FUNCTION fn_qc_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS tg_qc_updated_at ON quality_checks;
CREATE TRIGGER tg_qc_updated_at
  BEFORE UPDATE ON quality_checks
  FOR EACH ROW EXECUTE FUNCTION fn_qc_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié
CREATE POLICY "qc_select" ON quality_checks
  FOR SELECT TO authenticated USING (true);

-- Insertion : tout utilisateur authentifié (opérateur ou GM)
CREATE POLICY "qc_insert" ON quality_checks
  FOR INSERT TO authenticated WITH CHECK (true);

-- Modification : GM/admin seulement
CREATE POLICY "qc_update" ON quality_checks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('gm','admin')
    )
  );

-- Suppression : admin seulement
CREATE POLICY "qc_delete" ON quality_checks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
