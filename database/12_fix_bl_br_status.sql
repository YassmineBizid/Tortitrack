-- ============================================================
--  12_fix_bl_br_status.sql — Étendre les contraintes status
--  delivery_orders + return_orders
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- ── delivery_orders : ajouter 'delivered' ────────────────────
ALTER TABLE delivery_orders
  DROP CONSTRAINT IF EXISTS delivery_orders_status_check;

ALTER TABLE delivery_orders
  ADD CONSTRAINT delivery_orders_status_check
  CHECK (status IN ('draft','validated','delivered','cancelled'));

-- ── return_orders : ajouter 'pending_quality' ────────────────
ALTER TABLE return_orders
  DROP CONSTRAINT IF EXISTS return_orders_status_check;

ALTER TABLE return_orders
  ADD CONSTRAINT return_orders_status_check
  CHECK (status IN ('draft','validated','pending_quality','cancelled'));

-- ── RLS : s'assurer que INSERT/UPDATE sont permis ────────────
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bl_all" ON delivery_orders;
CREATE POLICY "bl_all" ON delivery_orders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

ALTER TABLE delivery_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bl_lines_all" ON delivery_lines;
CREATE POLICY "bl_lines_all" ON delivery_lines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

ALTER TABLE return_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "br_all" ON return_orders;
CREATE POLICY "br_all" ON return_orders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

ALTER TABLE return_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "br_lines_all" ON return_lines;
CREATE POLICY "br_lines_all" ON return_lines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
