-- ── Fix: élargir la contrainte statut sur prix_articles et promotions ──────
-- La contrainte initiale ne permettait que 'actif'/'inactif',
-- mais le workflow complet nécessite: brouillon, soumis, valide, refuse,
-- expire, suspendu, actif, inactif, remplace.

-- 1. Mise à jour de la contrainte statut sur prix_articles
DO $$
BEGIN
  ALTER TABLE prix_articles DROP CONSTRAINT IF EXISTS prix_articles_statut_check;
  ALTER TABLE prix_articles ADD CONSTRAINT prix_articles_statut_check
    CHECK (statut IN (
      'brouillon','soumis','valide','refuse',
      'expire','suspendu','actif','inactif','remplace'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Mise à jour de la contrainte statut sur promotions
DO $$
BEGIN
  ALTER TABLE promotions DROP CONSTRAINT IF EXISTS promotions_statut_check;
  ALTER TABLE promotions ADD CONSTRAINT promotions_statut_check
    CHECK (statut IN (
      'brouillon','soumis','valide','refuse',
      'expiree','active','suspendue','annulee'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. S'assurer que les colonnes manquantes existent sur prix_articles
DO $$
BEGIN
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS code          TEXT;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS designation   TEXT;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS marque        TEXT;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS format        TEXT;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS prix_ttc      NUMERIC(10,3);
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS zone          TEXT DEFAULT 'National';
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS valide        BOOLEAN DEFAULT FALSE;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS cree_par      TEXT;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS ancien_prix   NUMERIC(10,3) DEFAULT 0;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS evolution     NUMERIC(6,2)  DEFAULT 0;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS motif         TEXT;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS valide_par    TEXT;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS date_validation DATE;
  ALTER TABLE prix_articles ADD COLUMN IF NOT EXISTS commentaire_validation TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. S'assurer que les colonnes manquantes existent sur promotions
DO $$
BEGIN
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS nom         TEXT;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS type        TEXT;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS canaux      TEXT[];
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS prix_promo  NUMERIC(10,3) DEFAULT 0;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS qte_min     INTEGER DEFAULT 1;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS cree_par    TEXT;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS valide_par  TEXT;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS ca_estime   NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE promotions ADD COLUMN IF NOT EXISTS budget_promo NUMERIC(12,2) DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
