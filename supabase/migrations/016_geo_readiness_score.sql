-- ============================================================
-- 016_geo_readiness_score.sql
-- ============================================================
-- Adds the GEO (Generative Engine Optimisation) readiness
-- sub-score to press_releases. Calculated on publish; measures
-- LLM crawlability and structured data completeness.
--
-- No new tables, RLS policies, or triggers: the existing
-- press_releases policies (003_content.sql) already govern this
-- column.

ALTER TABLE press_releases
  ADD COLUMN IF NOT EXISTS geo_readiness_score integer
    CHECK (geo_readiness_score BETWEEN 0 AND 100);

COMMENT ON COLUMN press_releases.geo_readiness_score IS
  'GEO sub-score (0–100). Calculated on publish. Measures LLM crawlability and structured data completeness. See lib/utils/geoScore.ts for scoring logic.';

-- RLS verification: every table in the public schema must have
-- row-level security enabled.
-- Must return zero rows. If any rows appear, halt and fix.
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
