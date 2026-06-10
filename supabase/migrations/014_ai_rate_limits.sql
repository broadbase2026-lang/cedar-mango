-- ============================================================
-- 014_ai_rate_limits.sql
-- ============================================================
-- Per-user, per-endpoint hourly rate limiting for expensive
-- Gemini-backed routes (release import, release summary, etc.).
--
-- The journalist chat endpoint already throttles via
-- chat_rate_limits; this table covers the brand-side AI routes
-- that previously had no abuse/cost ceiling.
--
-- Writes happen with the service role (which bypasses RLS), so
-- only a read-own SELECT policy is exposed to clients.

CREATE TABLE IF NOT EXISTS ai_rate_limits (
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  window_start  timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, endpoint, window_start)
);

ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_rate_limits'
      AND policyname = 'ai_rate_limits: owner read'
  ) THEN
    CREATE POLICY "ai_rate_limits: owner read"
      ON ai_rate_limits FOR SELECT
      USING (
        (select auth.uid()) = user_id
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;
