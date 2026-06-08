-- ============================================================
-- 013_journalist_bounce_inactive.sql
-- Hard-bounce automation: inactive flag, portfolio unindex, 90-day purge
--
-- Prerequisites: 004_journalist.sql (journalist_profiles).
-- RLS hardening at the bottom also requires 010_journalist_portfolio.sql
-- (journalist_portfolio_settings, journalist_publications). If those tables
-- are missing, the core columns/tables below still apply; run this file
-- again after applying 010 to pick up the RLS changes.
-- ============================================================

ALTER TABLE journalist_profiles
  ADD COLUMN IF NOT EXISTS is_inactive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inactive_at timestamptz,
  ADD COLUMN IF NOT EXISTS inactive_reason text,
  ADD COLUMN IF NOT EXISTS scheduled_deletion_at timestamptz;

CREATE TABLE IF NOT EXISTS resend_webhook_events (
  event_id    text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_delivery_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journalist_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  email         text NOT NULL,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}',
  received_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_delivery_events_journalist_id_idx
  ON email_delivery_events (journalist_id);

-- Tighten public portfolio read: require journalist is active.
-- Skipped when 010_journalist_portfolio.sql has not been applied yet.
DO $$
BEGIN
  IF to_regclass('public.journalist_portfolio_settings') IS NULL THEN
    RAISE NOTICE '013: skipping portfolio RLS — apply 010_journalist_portfolio.sql first, then re-run this migration.';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "journalist_portfolio_settings: public read"
    ON journalist_portfolio_settings;

  CREATE POLICY "journalist_portfolio_settings: public read"
    ON journalist_portfolio_settings FOR SELECT
    USING (
      public = true
      AND EXISTS (
        SELECT 1 FROM journalist_profiles jp
        WHERE jp.id = journalist_portfolio_settings.journalist_id
          AND jp.is_inactive = false
      )
    );
END $$;

DO $$
BEGIN
  IF to_regclass('public.journalist_publications') IS NULL THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "journalist_publications: public portfolio read"
    ON journalist_publications;

  CREATE POLICY "journalist_publications: public portfolio read"
    ON journalist_publications FOR SELECT
    USING (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM journalist_portfolio_settings jps
        JOIN journalist_profiles jp ON jp.id = jps.journalist_id
        WHERE jps.journalist_id = journalist_publications.journalist_id
          AND jps.public = true
          AND jp.is_inactive = false
      )
    );

  DROP POLICY IF EXISTS "journalist_publications: brand read"
    ON journalist_publications;

  CREATE POLICY "journalist_publications: brand read"
    ON journalist_publications FOR SELECT
    USING (
      auth.role() = 'authenticated'
      AND deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (select auth.uid())
          AND user_type = 'brand'
      )
      AND EXISTS (
        SELECT 1 FROM journalist_portfolio_settings jps
        JOIN journalist_profiles jp ON jp.id = jps.journalist_id
        WHERE jps.journalist_id = journalist_publications.journalist_id
          AND jps.public = true
          AND jp.is_inactive = false
      )
    );
END $$;
