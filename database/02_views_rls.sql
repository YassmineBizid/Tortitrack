-- ============================================================
--  02_views_rls.sql — Vues analytiques + Row Level Security
--  Exécuter APRÈS 01_schema.sql
-- ============================================================

-- ── VUES ANALYTIQUES ─────────────────────────────────────────

CREATE OR REPLACE VIEW v_vendor_performance AS
SELECT
  v.id,
  v.name                                                            AS vendor_name,
  v.vehicle_plate,
  v.zone,
  COUNT(DISTINCT d.id)                                              AS total_bl,
  COUNT(DISTINCT r.id)                                              AS total_br,
  COALESCE(SUM(dl.quantity),0)                                      AS total_charged,
  COALESCE(SUM(rl.quantity),0)                                      AS total_returned,
  CASE WHEN COALESCE(SUM(dl.quantity),0) > 0
    THEN ROUND((COALESCE(SUM(rl.quantity),0)::NUMERIC / SUM(dl.quantity))*100, 1)
    ELSE 0 END                                                       AS return_rate_pct
FROM vendors v
LEFT JOIN delivery_orders d  ON d.vendor_id = v.id AND d.status = 'validated'
LEFT JOIN delivery_lines  dl ON dl.delivery_id = d.id
LEFT JOIN return_orders   r  ON r.vendor_id = v.id  AND r.status = 'validated'
LEFT JOIN return_lines    rl ON rl.return_id = r.id
WHERE v.is_active = true
GROUP BY v.id, v.name, v.vehicle_plate, v.zone
ORDER BY total_charged DESC;

CREATE OR REPLACE VIEW v_return_reasons_summary AS
SELECT
  DATE_TRUNC('month', r.date::TIMESTAMPTZ) AS month,
  rl.reason,
  COUNT(*)                                  AS nb_lines,
  SUM(rl.quantity)                          AS total_qty,
  ROUND(AVG(rl.ai_confidence),1)            AS avg_ai_confidence
FROM return_orders r
JOIN return_lines rl ON rl.return_id = r.id
WHERE r.status = 'validated'
  AND rl.reason IS NOT NULL
GROUP BY DATE_TRUNC('month', r.date::TIMESTAMPTZ), rl.reason
ORDER BY month DESC, total_qty DESC;

CREATE OR REPLACE VIEW v_dlc_alerts AS
SELECT
  dl.id,
  do2.number                                  AS bl_number,
  do2.date                                    AS bl_date,
  v.name                                      AS vendor_name,
  dl.product_name,
  dl.product_ref,
  dl.lot_number,
  dl.expiry_date,
  (dl.expiry_date - CURRENT_DATE)             AS days_remaining,
  dl.quantity,
  dl.photo_url
FROM delivery_lines dl
JOIN delivery_orders do2 ON do2.id = dl.delivery_id
LEFT JOIN vendors v ON v.id = do2.vendor_id
WHERE dl.expiry_date >= CURRENT_DATE
  AND (dl.expiry_date - CURRENT_DATE) <= (
    SELECT value::INT FROM app_settings WHERE key = 'dlc_alert_days'
  )
  AND do2.status = 'validated'
ORDER BY dl.expiry_date ASC;

CREATE OR REPLACE VIEW v_daily_kpis AS
SELECT
  dates.dt                                                                        AS date,
  COUNT(DISTINCT d.id)                                                            AS total_bl,
  COUNT(DISTINCT r.id)                                                            AS total_br,
  COALESCE(SUM(dl.quantity),0)                                                    AS total_charged,
  COALESCE(SUM(rl.quantity),0)                                                    AS total_returned,
  CASE WHEN COALESCE(SUM(dl.quantity),0) > 0
    THEN ROUND((COALESCE(SUM(rl.quantity),0)::NUMERIC/COALESCE(SUM(dl.quantity),1))*100,1)
    ELSE 0 END                                                                     AS return_rate_pct,
  COUNT(rl.id) FILTER (WHERE rl.ai_validated_by_operator = true)                  AS ai_analyses
FROM GENERATE_SERIES(CURRENT_DATE - 30, CURRENT_DATE, '1 day'::INTERVAL) AS dates(dt)
LEFT JOIN delivery_orders d  ON d.date = dates.dt AND d.status = 'validated'
LEFT JOIN delivery_lines  dl ON dl.delivery_id = d.id
LEFT JOIN return_orders   r  ON r.date = dates.dt AND r.status = 'validated'
LEFT JOIN return_lines    rl ON rl.return_id = r.id
GROUP BY dates.dt
ORDER BY dates.dt DESC;

CREATE OR REPLACE VIEW v_top_returned_products AS
SELECT
  rl.product_ref,
  rl.product_name,
  SUM(rl.quantity)                AS total_returned,
  COUNT(*)                        AS nb_returns,
  MODE() WITHIN GROUP (ORDER BY rl.reason) AS main_reason
FROM return_lines rl
JOIN return_orders r ON r.id = rl.return_id AND r.status = 'validated'
GROUP BY rl.product_ref, rl.product_name
ORDER BY total_returned DESC
LIMIT 20;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_lines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings       ENABLE ROW LEVEL SECURITY;

-- Profils : chacun voit le sien
CREATE POLICY "own_profile" ON user_profiles FOR ALL TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Vendeurs : lecture pour tous les authentifiés, écriture pour GM
CREATE POLICY "vendors_read"  ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendors_write" ON vendors FOR ALL TO authenticated
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('gm','admin'));

-- Produits : lecture pour tous, écriture pour GM
CREATE POLICY "products_read"  ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write" ON products FOR ALL TO authenticated
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('gm','admin'));

-- BL/BR : lecture pour tous, écriture pour opérateur/gm
CREATE POLICY "delivery_read"  ON delivery_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_write" ON delivery_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "delivery_lines_read"  ON delivery_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_lines_write" ON delivery_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "return_read"  ON return_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "return_write" ON return_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "return_lines_read"  ON return_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "return_lines_write" ON return_lines FOR INSERT TO authenticated WITH CHECK (true);

-- Settings : lecture pour tous, écriture pour GM
CREATE POLICY "settings_read"  ON app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_write" ON app_settings FOR UPDATE TO authenticated
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('gm','admin'));

-- Email log : lecture GM seulement, écriture pour tous
CREATE POLICY "emaillog_read"  ON email_log FOR SELECT TO authenticated
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('gm','admin'));
CREATE POLICY "emaillog_write" ON email_log FOR INSERT TO authenticated WITH CHECK (true);

-- ── STORAGE BUCKET ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photos_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-photos');
CREATE POLICY "photos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-photos');
CREATE POLICY "photos_public_read" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'product-photos');

-- ── INDEX PERFORMANCES ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_delivery_orders_date    ON delivery_orders(date);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_vendor  ON delivery_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_delivery_lines_delivery ON delivery_lines(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_lines_expiry   ON delivery_lines(expiry_date);
CREATE INDEX IF NOT EXISTS idx_return_orders_date      ON return_orders(date);
CREATE INDEX IF NOT EXISTS idx_return_orders_vendor    ON return_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_return     ON return_lines(return_id);
CREATE INDEX IF NOT EXISTS idx_return_lines_reason     ON return_lines(reason);
