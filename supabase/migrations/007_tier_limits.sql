-- ============================================================
-- 007_tier_limits.sql
-- ============================================================
--
-- Adds application-enforced publish limits per billing period.
-- Counter reset is handled by the Stripe webhook handler when
-- `current_period_end` changes (no database trigger).

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS releases_published_this_period integer NOT NULL DEFAULT 0;

