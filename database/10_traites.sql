-- ============================================================
--  10_traites.sql — Traites & Échéances (Lettres de change)
--  Exécuter APRÈS 09_missing_tables.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS traites (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero          TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('emise','recue')),
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name     TEXT,
  fournisseur_id  UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  beneficiaire    TEXT,
  tireur          TEXT,
  tire            TEXT,
  montant         NUMERIC(12,3) NOT NULL CHECK (montant > 0),
  montant_lettres TEXT,
  devise          TEXT DEFAULT 'TND',
  date_creation   DATE,
  date_reception  DATE,
  date_echeance   DATE NOT NULL,
  lieu            TEXT,
  banque          TEXT,
  rib             TEXT,
  banque_client   TEXT,
  banque_depot    TEXT,
  ref_bordereau   TEXT,
  date_depot      DATE,
  objet           TEXT,
  commentaire     TEXT,
  statut          TEXT NOT NULL DEFAULT 'brouillon',
  risque_niveau   TEXT DEFAULT 'low' CHECK (risque_niveau IN ('low','medium','high','critical')),
  facture_ids     TEXT[] DEFAULT '{}',
  events          JSONB DEFAULT '[]',
  operator_id     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at (recrée la fonction si absente — normalement définie dans 04_production.sql)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_traites_updated_at ON traites;
CREATE TRIGGER trg_traites_updated_at
  BEFORE UPDATE ON traites
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE traites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traites_all" ON traites FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_traites_type          ON traites(type);
CREATE INDEX IF NOT EXISTS idx_traites_statut        ON traites(statut);
CREATE INDEX IF NOT EXISTS idx_traites_date_echeance ON traites(date_echeance);
CREATE INDEX IF NOT EXISTS idx_traites_client_id     ON traites(client_id);
