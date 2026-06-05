-- ============================================================
--  16_planning.sql — Table Planning Production
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS planning_production (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_prod     DATE NOT NULL,
  poste         TEXT NOT NULL CHECK (poste IN ('matin','apres_midi','nuit')),
  art_id        TEXT NOT NULL,
  article       TEXT NOT NULL,
  qty           INTEGER NOT NULL CHECK (qty > 0),
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','done','cancelled')),
  est_critique  BOOLEAN NOT NULL DEFAULT false,
  ia_score      INTEGER DEFAULT 90,
  commande_ids  JSONB DEFAULT '[]'::jsonb,
  valid_cc      BOOLEAN NOT NULL DEFAULT false,
  valid_cu      BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_date ON planning_production(date_prod DESC);
CREATE INDEX IF NOT EXISTS idx_planning_poste ON planning_production(poste);

-- Trigger : updated_at automatique
CREATE OR REPLACE FUNCTION fn_planning_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS tg_planning_updated_at ON planning_production;
CREATE TRIGGER tg_planning_updated_at
  BEFORE UPDATE ON planning_production
  FOR EACH ROW EXECUTE FUNCTION fn_planning_updated_at();

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE planning_production ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié
CREATE POLICY "planning_select" ON planning_production
  FOR SELECT TO authenticated USING (true);

-- Insertion : chef_usine, dg, admin
CREATE POLICY "planning_insert" ON planning_production
  FOR INSERT TO authenticated WITH CHECK (true);

-- Mise à jour : chef_usine, dg, admin
CREATE POLICY "planning_update" ON planning_production
  FOR UPDATE TO authenticated USING (true);

-- Suppression : admin seulement
CREATE POLICY "planning_delete" ON planning_production
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );
