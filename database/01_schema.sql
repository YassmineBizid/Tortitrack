-- ============================================================
--  01_schema.sql — Schéma principal BT Food Industry
--  Module Sortie & Retour PF
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── PROFILS UTILISATEURS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('operator','gm','admin')),
  vendor_id   UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: créer profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION fn_create_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- Ne pas bloquer l'inscription si l'insert profil échoue
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_create_user_profile();

-- ── VENDEURS / CHAUFFEURS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  vehicle_plate TEXT NOT NULL,
  zone          TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_vehicle_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id  UUID REFERENCES vendors(id),
  old_plate  TEXT,
  new_plate  TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id)
);

-- Données initiales vendeurs
INSERT INTO vendors (code, name, phone, vehicle_plate, zone) VALUES
  ('V01', 'Ali Hamdi',          '98131468', 'TU-123-TN', 'Ben Arous'),
  ('V02', 'Abder Belhaj Kacem', '98132466', 'TU-456-TN', 'Ariana'),
  ('V03', 'Mohamed Ben Salah',  '71234567', 'TU-789-TN', 'Tunis Centre')
ON CONFLICT (code) DO NOTHING;

-- ── CATALOGUE PRODUITS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode         TEXT UNIQUE,
  ref             TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  weight          TEXT,
  category        TEXT,
  shelf_life_days INTEGER DEFAULT 21,
  unit_price      NUMERIC(10,3) DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
-- Migration : ajouter unit_price si la table existe déjà
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,3) DEFAULT 0;

INSERT INTO products (barcode, ref, name, weight, category, shelf_life_days) VALUES
  ('3701234560011', 'TC21-01',  'Tortilla Classique 2τ 1ps',  '250g',  'Tortilla Classique', 21),
  ('3701234560028', 'TC26-01',  'Tortilla Classique 3τ 1ps',  '375g',  'Tortilla Classique', 21),
  ('3701234560035', 'THGR-01',  'Tortilla Huile & Grains 2τ', '250g',  'Tortilla Spéciale',  21),
  ('3701234560042', 'TC12-02',  'Tortilla Classique 12τ',      '1.2kg', 'Tortilla Classique', 21),
  ('3701234560059', 'TW25-01',  'Tortilla Wholegrain 2τ',      '250g',  'Tortilla Bio',       18)
ON CONFLICT (ref) DO NOTHING;

-- ── BONS DE LIVRAISON ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number          TEXT UNIQUE NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id       UUID REFERENCES vendors(id),
  vendor_snapshot JSONB,
  operator_id     UUID REFERENCES auth.users(id),
  status          TEXT DEFAULT 'validated' CHECK (status IN ('draft','validated','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_lines (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id         UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id),
  barcode             TEXT,
  product_ref         TEXT NOT NULL,
  product_name        TEXT NOT NULL,
  lot_number          TEXT,
  manufacture_date    DATE,
  expiry_date         DATE NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price          NUMERIC(10,3) DEFAULT 0,
  photo_url           TEXT,
  photo_storage_path  TEXT,
  ai_analyzed         BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
-- Migration
ALTER TABLE delivery_lines ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,3) DEFAULT 0;

-- ── BONS DE RETOUR ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS return_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number          TEXT UNIQUE NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id       UUID REFERENCES vendors(id),
  vendor_snapshot JSONB,
  client_name     TEXT,
  client_phone    TEXT,
  operator_id     UUID REFERENCES auth.users(id),
  status          TEXT DEFAULT 'validated' CHECK (status IN ('draft','validated','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_lines (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_id                 UUID NOT NULL REFERENCES return_orders(id) ON DELETE CASCADE,
  product_id                UUID REFERENCES products(id),
  barcode                   TEXT,
  product_ref               TEXT NOT NULL,
  product_name              TEXT NOT NULL,
  lot_number                TEXT,
  manufacture_date          DATE,
  expiry_date               DATE,
  quantity                  INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price                NUMERIC(10,3) DEFAULT 0,
  reason                    TEXT CHECK (reason IN (
    'moisissure_avant_dlc_pv','produit_abime_client','produit_abime_camion',
    'moisissure_camion','dlc_atteint_camion','dlc_atteint_pv'
  )),
  ai_suggested_reason       TEXT,
  ai_confidence             INTEGER CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_explanation            TEXT,
  ai_validated_by_operator  BOOLEAN DEFAULT false,
  photo_url                 TEXT,
  photo_storage_path        TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);
-- Migration
ALTER TABLE return_lines ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,3) DEFAULT 0;

-- ── EMAIL LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_type   TEXT CHECK (document_type IN ('BL','BR','RAPPORT')),
  document_id     UUID,
  document_number TEXT,
  recipient_email TEXT NOT NULL,
  sent_by         UUID REFERENCES auth.users(id),
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  status          TEXT DEFAULT 'sent'
);

-- ── PARAMÈTRES APPLICATION ────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

INSERT INTO app_settings (key, value, description) VALUES
  ('gm_email',         'direction@btfood.tn',              'Email destinataire des BL/BR et rapports'),
  ('return_alert_pct', '3',                                 'Seuil alerte taux retour (%)'),
  ('dlc_alert_days',   '3',                                 'Jours avant DLC pour déclencher alerte'),
  ('company_name',     'BT Food Industry',                  'Nom de la société'),
  ('company_address',  '16, Rue Annaba – Z.I. Ben Arous',  'Adresse société'),
  ('company_phone',    '70 026 600',                        'Téléphone société'),
  ('company_mf',       '1887237 G.A.M 000',                'Matricule fiscal'),
  ('cron_secret',      'CHANGE_ME_64_CHAR_RANDOM_SECRET',  'Secret pg_cron ↔ Edge Function'),
  ('supabase_url',     'https://VOTRE_PROJET.supabase.co', 'URL Supabase projet')
ON CONFLICT (key) DO NOTHING;
