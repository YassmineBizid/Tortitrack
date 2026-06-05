-- ============================================================
--  11_fix_rls.sql — Correction des politiques RLS
--  production_lots + ajout colonne blocked_reason
--  Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Ajouter la colonne blocked_reason si absente ──────────
ALTER TABLE production_lots
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- ── 2. Politique INSERT — tous les utilisateurs authentifiés ─
--  (La production est une opération interne, pas besoin de restricter)
DROP POLICY IF EXISTS "lots_insert" ON production_lots;
CREATE POLICY "lots_insert"
  ON production_lots FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── 3. Politique UPDATE — tous les utilisateurs authentifiés ─
--  (Blocage / déblocage de lots)
DROP POLICY IF EXISTS "lots_update" ON production_lots;
CREATE POLICY "lots_update"
  ON production_lots FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. Politique DELETE — gm / admin seulement (inchangé) ───
DROP POLICY IF EXISTS "lots_delete" ON production_lots;
CREATE POLICY "lots_delete"
  ON production_lots FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('gm','admin','dg')
    )
  );
