-- ============================================================
--  09_missing_tables.sql — Tables manquantes BT Food Industry
--  Exécuter dans : Supabase Dashboard → SQL Editor
--  Exécuter APRÈS 01_schema.sql, 04_production.sql, 05_quality.sql
-- ============================================================

-- ── Étendre les colonnes des tables existantes ───────────────
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS client_id   UUID;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS qc_decision TEXT;

ALTER TABLE return_orders   ADD COLUMN IF NOT EXISTS client_id   UUID;
ALTER TABLE return_orders   ADD COLUMN IF NOT EXISTS qc_decision TEXT;

-- ── CLIENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  zone          TEXT,
  type          TEXT,
  potentiel     TEXT DEFAULT 'B' CHECK (potentiel IN ('A','B','C')),
  dormant       BOOLEAN DEFAULT false,
  phone         TEXT,
  last_order    DATE,
  credit_limit  NUMERIC(12,3) DEFAULT 0,
  terms         INTEGER DEFAULT 30,
  commercial_id TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','validated','rejected','pending_validation')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delivery_orders
  ADD CONSTRAINT IF NOT EXISTS fk_delivery_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE return_orders
  ADD CONSTRAINT IF NOT EXISTS fk_return_client
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Données initiales clients
INSERT INTO clients (name, zone, type, potentiel, dormant, phone, credit_limit, terms, status) VALUES
  ('Carrefour Lac',    'Tunis Centre', 'Hypermarché', 'A', false, '+216 71 xxx', 50000, 30, 'validated'),
  ('Monoprix Manar',   'Tunis Nord',   'Supermarché', 'A', false, '+216 71 xxx', 30000, 30, 'validated'),
  ('Aziza Menzah',     'Tunis Centre', 'Supermarché', 'B', true,  '+216 71 xxx', 20000, 45, 'validated'),
  ('Géant Sousse',     'Sousse',       'Hypermarché', 'A', false, '+216 73 xxx', 40000, 45, 'validated'),
  ('Épicerie Rachidi', 'Tunis Sud',    'Épicerie',    'C', true,  '+216 71 xxx',  5000, 15, 'validated'),
  ('Nouveau Client',   'Tunis Nord',   'Supermarché', 'B', false, '+216 71 xxx', 15000, 30, 'pending')
ON CONFLICT DO NOTHING;

-- ── FOURNISSEURS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fournisseurs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  contact         TEXT,
  tel             TEXT,
  email           TEXT,
  matieres        TEXT[],
  delai           INTEGER DEFAULT 7,
  evaluation      INTEGER DEFAULT 3 CHECK (evaluation BETWEEN 1 AND 5),
  mode_paiement   TEXT,
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO fournisseurs (name, contact, tel, email, matieres, delai, evaluation, mode_paiement, notes) VALUES
  ('Moulins du Nord', 'Mohamed Ben Ali', '+216 71 xxx', 'contact@moulinsnord.tn', ARRAY['Farine T55','Farine T65'], 3, 5, 'Virement 30j', 'Fournisseur principal farine'),
  ('Huiles Réunies',  'Sonia Trabelsi',  '+216 73 xxx', 'sr@huiles.tn',           ARRAY['Huile végétale'],         5, 4, 'Chèque',        ''),
  ('Emballages Pro',  'Karim Mansour',   '+216 70 xxx', 'km@embpro.tn',           ARRAY['Films','Boîtes','Étiq.'], 7, 3, 'Virement 45j',  'Délai souvent dépassé'),
  ('Sel & Épices TN', 'Faouzi Gharbali', '+216 75 xxx', 'fg@selepices.tn',        ARRAY['Sel','Levure','Épices'],  2, 4, 'Espèces',       '')
ON CONFLICT DO NOTHING;

-- ── COMMANDES PF (Produits Finis) ────────────────────────────
CREATE TABLE IF NOT EXISTS commandes_pf (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number          TEXT UNIQUE NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name     TEXT,
  type            TEXT DEFAULT 'livraison' CHECK (type IN ('livraison','vente_directe')),
  date_livraison  DATE,
  status          TEXT DEFAULT 'draft',
  priorite        TEXT DEFAULT 'normal' CHECK (priorite IN ('normal','urgent','critique')),
  total           NUMERIC(12,3) DEFAULT 0,
  commercial      TEXT,
  notes           TEXT,
  operator_id     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commandes_pf_lines (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commande_id  UUID NOT NULL REFERENCES commandes_pf(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id),
  art_id       TEXT,
  qty          INTEGER NOT NULL DEFAULT 1,
  unit_price   NUMERIC(10,3) DEFAULT 0,
  lot_id       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMANDES MP (Matières Premières) ────────────────────────
CREATE TABLE IF NOT EXISTS commandes_mp (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number                  TEXT UNIQUE NOT NULL,
  matiere                 TEXT NOT NULL,
  fournisseur_id          UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
  fournisseur_name        TEXT,
  qty                     NUMERIC(12,3) NOT NULL DEFAULT 0,
  unite                   TEXT DEFAULT 'kg',
  prix_unitaire           NUMERIC(10,3) DEFAULT 0,
  total                   NUMERIC(12,3) DEFAULT 0,
  status                  TEXT DEFAULT 'en_attente_devis',
  date_livraison_convenue DATE,
  acheteur                TEXT,
  notes                   TEXT,
  operator_id             UUID REFERENCES auth.users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── FACTURES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS factures (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number        TEXT UNIQUE NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  vendeur       TEXT,
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name   TEXT,
  total_ht      NUMERIC(12,3) DEFAULT 0,
  tva           NUMERIC(12,3) DEFAULT 0,
  total_ttc     NUMERIC(12,3) DEFAULT 0,
  mode_paiement TEXT DEFAULT 'cheque',
  montant_paye  NUMERIC(12,3) DEFAULT 0,
  status        TEXT DEFAULT 'impayee' CHECK (status IN ('payee','impayee','partielle','annulee')),
  tournee_id    TEXT,
  notes         TEXT,
  operator_id   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facture_lignes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  art_id     TEXT,
  product_id UUID REFERENCES products(id),
  qty        INTEGER NOT NULL DEFAULT 1,
  prix_ht    NUMERIC(10,3) DEFAULT 0,
  total_ht   NUMERIC(12,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ENCAISSEMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encaissements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facture_id  UUID REFERENCES factures(id) ON DELETE SET NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  montant     NUMERIC(12,3) NOT NULL DEFAULT 0,
  mode        TEXT DEFAULT 'cheque',
  vendeur     TEXT,
  tournee_id  TEXT,
  notes       TEXT,
  operator_id UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── STOCK CAMION ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_camion (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendeur     TEXT,
  vehicule    TEXT,
  art_id      TEXT,
  art_code    TEXT,
  lot         TEXT,
  lot_id      TEXT,
  qte_chargee INTEGER DEFAULT 0,
  qte_vendue  INTEGER DEFAULT 0,
  qte_retour  INTEGER DEFAULT 0,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  operator_id UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── JOURNAL AUDIT ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name    TEXT,
  user_role    TEXT,
  action       TEXT NOT NULL,
  doc_type     TEXT,
  doc_number   TEXT,
  comment      TEXT,
  is_exception BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── EMPLOYÉS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom           TEXT NOT NULL,
  prenom        TEXT,
  poste         TEXT,
  date_embauche DATE,
  salaire       NUMERIC(10,3) DEFAULT 0,
  heures_base   NUMERIC(4,2) DEFAULT 8,
  heures_hebdo  NUMERIC(5,2) DEFAULT 40,
  status        TEXT DEFAULT 'actif' CHECK (status IN ('actif','inactif','suspendu')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO employes (nom, prenom, poste, date_embauche, salaire, heures_base, heures_hebdo) VALUES
  ('Jlassi',    'Mahmoud', 'Chef d''Usine',   '2020-01-15', 3500, 8, 40),
  ('Belhaj',    'Ahmed',   'Commercial',       '2021-03-01', 2800, 8, 40),
  ('Ferchichi', 'Nadia',   'Responsable QC',  '2019-06-01', 3200, 8, 40),
  ('Chaieb',    'Tarek',   'Acheteur',         '2022-09-01', 2600, 8, 40)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS presences (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id    UUID REFERENCES employes(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  heure_arrivee TEXT,
  heure_depart  TEXT,
  statut        TEXT DEFAULT 'present' CHECK (statut IN ('present','absent','retard','conge')),
  motif         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employe_id, date)
);

-- ── PRIX ARTICLES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prix_articles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  art_id     TEXT NOT NULL,
  art_code   TEXT,
  canal      TEXT DEFAULT 'Détail',
  prix_ht    NUMERIC(10,3) NOT NULL DEFAULT 0,
  tva        INTEGER DEFAULT 19,
  statut     TEXT DEFAULT 'actif' CHECK (statut IN ('actif','inactif')),
  date_debut DATE,
  date_fin   DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── MISE À JOUR DES CONTRAINTES ──────────────────────────────
-- Autoriser le statut 'pending_quality' sur return_orders
DO $$
BEGIN
  ALTER TABLE return_orders DROP CONSTRAINT IF EXISTS return_orders_status_check;
  ALTER TABLE return_orders ADD CONSTRAINT return_orders_status_check
    CHECK (status IN ('draft','pending_quality','validated','cancelled'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Autoriser le type 'reservation' sur commandes_pf
DO $$
BEGIN
  ALTER TABLE commandes_pf DROP CONSTRAINT IF EXISTS commandes_pf_type_check;
  ALTER TABLE commandes_pf ADD CONSTRAINT commandes_pf_type_check
    CHECK (type IN ('livraison','vente_directe','reservation'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── PROMOTIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  art_ids    TEXT[],
  canal      TEXT,
  remise_pct NUMERIC(5,3) DEFAULT 0,
  date_debut DATE,
  date_fin   DATE,
  statut     TEXT DEFAULT 'active' CHECK (statut IN ('active','expiree','annulee')),
  created_by TEXT,
  motif      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── FLOTTE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flotte (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  immat      TEXT UNIQUE NOT NULL,
  type       TEXT,
  cap_kg     INTEGER DEFAULT 0,
  cap_m3     INTEGER DEFAULT 0,
  commercial TEXT,
  status     TEXT DEFAULT 'disponible' CHECK (status IN ('disponible','en_route','maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO flotte (immat, type, cap_kg, cap_m3, commercial, status) VALUES
  ('100TU2026', 'Camionnette', 1500, 8,  'Ahmed Belhaj',  'disponible'),
  ('200TU2026', 'Camion',      3000, 18, 'Sonia Kamoun',  'en_route'),
  ('300TU2026', 'Camionnette', 1500, 8,  'Karim Mrad',    'disponible')
ON CONFLICT (immat) DO NOTHING;

-- ── ALERTES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sev        TEXT NOT NULL CHECK (sev IN ('critical','high','medium','low')),
  type       TEXT,
  title      TEXT NOT NULL,
  rec        TEXT,
  status     TEXT DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_pf         ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_pf_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes_mp         ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures             ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture_lignes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE encaissements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_camion         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE employes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE presences            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prix_articles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE flotte               ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts               ENABLE ROW LEVEL SECURITY;

-- Politique générale : tout utilisateur authentifié peut lire et écrire
-- (à affiner par rôle selon besoins sécurité)
CREATE POLICY "clients_all"            ON clients            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fournisseurs_all"       ON fournisseurs       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commandes_pf_all"       ON commandes_pf       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commandes_pf_lines_all" ON commandes_pf_lines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "commandes_mp_all"       ON commandes_mp       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "factures_all"           ON factures           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "facture_lignes_all"     ON facture_lignes     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "encaissements_all"      ON encaissements      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "stock_camion_all"       ON stock_camion       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "employes_all"           ON employes           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "presences_all"          ON presences          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "prix_articles_all"      ON prix_articles      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "promotions_all"         ON promotions         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "flotte_all"             ON flotte             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "alerts_all"             ON alerts             FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- audit_log : insertion libre, lecture réservée DG/admin
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_select" ON audit_log FOR SELECT TO authenticated
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('dg','gm','admin'));

-- ── INDEX PERFORMANCES ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_name          ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_zone          ON clients(zone);
CREATE INDEX IF NOT EXISTS idx_cpf_client_id         ON commandes_pf(client_id);
CREATE INDEX IF NOT EXISTS idx_cpf_status            ON commandes_pf(status);
CREATE INDEX IF NOT EXISTS idx_cmp_fournisseur_id    ON commandes_mp(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_cmp_status            ON commandes_mp(status);
CREATE INDEX IF NOT EXISTS idx_factures_client_id    ON factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_status       ON factures(status);
CREATE INDEX IF NOT EXISTS idx_factures_date         ON factures(date);
CREATE INDEX IF NOT EXISTS idx_encaissements_date    ON encaissements(date);
CREATE INDEX IF NOT EXISTS idx_stock_camion_date     ON stock_camion(date);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status         ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_presences_employe     ON presences(employe_id, date);
