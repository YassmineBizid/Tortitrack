-- ============================================================
--  04_production.sql — Lots de production (Stock PF)
--  Exécuter APRÈS 01_schema.sql
-- ============================================================

-- ── TABLE PRINCIPALE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_lots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_number       TEXT NOT NULL,
  internal_code    TEXT,
  product_id       UUID REFERENCES products(id),
  prod_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  manufacture_date DATE,
  expiry_date      DATE NOT NULL,
  init_qty         INTEGER NOT NULL DEFAULT 0 CHECK (init_qty >= 0),
  avail_qty        INTEGER NOT NULL DEFAULT 0 CHECK (avail_qty >= 0),
  status           TEXT NOT NULL DEFAULT 'available'
                     CHECK (status IN ('available','blocked','quarantine','exhausted')),
  risk_score       TEXT DEFAULT 'low'
                     CHECK (risk_score IN ('low','medium','high','critical')),
  operator_id      UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_lots_updated_at ON production_lots;
CREATE TRIGGER trg_lots_updated_at
  BEFORE UPDATE ON production_lots
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE production_lots ENABLE ROW LEVEL SECURITY;

-- GM / admin : accès complet
CREATE POLICY "lots_gm_full"
  ON production_lots FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('gm','admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('gm','admin'))
  );

-- Opérateurs : lecture seule
CREATE POLICY "lots_operator_read"
  ON production_lots FOR SELECT TO authenticated
  USING (true);

-- ── INDEX ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lots_product_id  ON production_lots(product_id);
CREATE INDEX IF NOT EXISTS idx_lots_status       ON production_lots(status);
CREATE INDEX IF NOT EXISTS idx_lots_expiry_date  ON production_lots(expiry_date);
CREATE INDEX IF NOT EXISTS idx_lots_prod_date    ON production_lots(prod_date);
