-- ============================================================
--  setup-cron.sql
--  Configuration pg_cron + pg_net pour rapport Excel quotidien
--  BT Food Industry — Module Sortie & Retour PF
--
--  Prérequis: activer pg_cron dans Supabase
--    Dashboard → Database → Extensions → pg_cron ✅
--    Dashboard → Database → Extensions → pg_net  ✅
-- ============================================================

-- ── 1. ACTIVER LES EXTENSIONS ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. TABLE DE LOG DES RAPPORTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_schedule_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  triggered_at TIMESTAMPTZ,
  status      TEXT DEFAULT 'scheduled',
  response    JSONB,
  error       TEXT
);

-- ── 3. FONCTION HELPER : déclenche la Edge Function ──────────────────────────
CREATE OR REPLACE FUNCTION fn_trigger_daily_report()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_supabase_url  TEXT;
  v_cron_secret   TEXT;
  v_request_id    BIGINT;
BEGIN
  -- Récupérer config depuis app_settings
  SELECT value INTO v_supabase_url FROM app_settings WHERE key = 'supabase_url';
  SELECT value INTO v_cron_secret  FROM app_settings WHERE key = 'cron_secret';

  -- Fallback si pas dans settings
  v_supabase_url := COALESCE(v_supabase_url, current_setting('app.supabase_url', true));
  v_cron_secret  := COALESCE(v_cron_secret,  current_setting('app.cron_secret',  true));

  -- Log déclenchement
  INSERT INTO report_schedule_log (triggered_at, status)
  VALUES (NOW(), 'triggered');

  -- Appel HTTP vers la Edge Function
  SELECT net.http_post(
    url     := v_supabase_url || '/functions/v1/daily-excel-report',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-cron-secret',   v_cron_secret
    ),
    body    := jsonb_build_object(
      'date_from', (NOW() - INTERVAL '1 day')::DATE::TEXT,
      'date_to',   (NOW() - INTERVAL '1 day')::DATE::TEXT
    )
  ) INTO v_request_id;

  RAISE LOG 'Daily report triggered, request_id: %', v_request_id;
END;
$$;

-- ── 4. PLANIFIER À MINUIT (heure Tunisie = UTC+1) ────────────────────────────
-- Minuit heure TN = 23h00 UTC
-- Format cron: minutes heures jour_du_mois mois jour_de_la_semaine

-- Supprimer si existe déjà
SELECT cron.unschedule('btfi-daily-report') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'btfi-daily-report'
);

-- Planifier à 23h00 UTC (= minuit heure Tunisie)
SELECT cron.schedule(
  'btfi-daily-report',
  '0 23 * * *',           -- Chaque jour à 23:00 UTC
  $$SELECT fn_trigger_daily_report()$$
);

-- ── 5. VÉRIFIER ──────────────────────────────────────────────────────────────
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE jobname = 'btfi-daily-report';

-- ── 6. DÉCLENCHER MANUELLEMENT (test) ────────────────────────────────────────
-- SELECT fn_trigger_daily_report();

-- ── 7. AJOUTER CLÉS DANS app_settings ────────────────────────────────────────
INSERT INTO app_settings (key, value, description) VALUES
  ('cron_secret',  'CHANGE_ME_RANDOM_SECRET_64_CHARS',  'Secret partagé entre pg_cron et Edge Function'),
  ('supabase_url', 'https://YOUR_PROJECT.supabase.co',  'URL du projet Supabase')
ON CONFLICT (key) DO NOTHING;

-- ── 8. RAPPORT HISTORIQUE (vue pour suivre les envois) ───────────────────────
CREATE OR REPLACE VIEW v_report_history AS
SELECT
  el.id,
  el.sent_at,
  el.recipient_email,
  el.document_number AS rapport,
  el.status,
  EXTRACT(HOUR FROM el.sent_at)::INT AS heure_envoi
FROM email_log el
WHERE el.document_type = 'BR'
  AND el.status IN ('auto','sent_auto')
ORDER BY el.sent_at DESC;

-- ── RÉSUMÉ ────────────────────────────────────────────────────────────────────
-- 1. Activer pg_cron + pg_net dans Dashboard Supabase
-- 2. Définir les secrets:
--    supabase secrets set RESEND_API_KEY=re_xxxx
--    supabase secrets set REPORT_EMAIL=direction@btfood.tn
--    supabase secrets set CRON_SECRET=votre_secret_aleatoire
-- 3. Mettre à jour app_settings avec l'URL et le secret
-- 4. Exécuter ce fichier SQL dans l'éditeur SQL Supabase
-- 5. Le rapport sera envoyé chaque jour à minuit (heure TN)
--    avec le fichier Excel en pièce jointe contenant:
--    - Tous les BL du jour avec URLs photos
--    - Tous les BR du jour avec causes IA et URLs photos
--    - Résumé statistiques
-- ============================================================
