-- ============================================================
-- 021_reserve_publish_slot.sql
-- Atomic trial / period publish counters (prevents concurrent bypass).
-- ============================================================

CREATE OR REPLACE FUNCTION reserve_publish_slot(
  p_subscription_id uuid,
  p_tier_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_trial_mode boolean;
  v_trial_used integer;
  v_period_count integer;
BEGIN
  SELECT trial_mode, trial_releases_used, releases_published_this_period
  INTO v_trial_mode, v_trial_used, v_period_count
  FROM subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_trial_mode THEN
    IF v_trial_used >= 1 THEN
      RETURN false;
    END IF;
    UPDATE subscriptions
    SET trial_releases_used = trial_releases_used + 1,
        updated_at = now()
    WHERE id = p_subscription_id;
    RETURN true;
  END IF;

  IF p_tier_limit IS NOT NULL THEN
    IF v_period_count >= p_tier_limit THEN
      RETURN false;
    END IF;
    UPDATE subscriptions
    SET releases_published_this_period = releases_published_this_period + 1,
        updated_at = now()
    WHERE id = p_subscription_id;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION release_publish_slot(
  p_subscription_id uuid,
  p_tier_limit integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_trial_mode boolean;
BEGIN
  SELECT trial_mode INTO v_trial_mode
  FROM subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_trial_mode THEN
    UPDATE subscriptions
    SET trial_releases_used = GREATEST(trial_releases_used - 1, 0),
        updated_at = now()
    WHERE id = p_subscription_id;
    RETURN;
  END IF;

  IF p_tier_limit IS NOT NULL THEN
    UPDATE subscriptions
    SET releases_published_this_period = GREATEST(releases_published_this_period - 1, 0),
        updated_at = now()
    WHERE id = p_subscription_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION reserve_publish_slot(uuid, integer)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION release_publish_slot(uuid, integer)
  FROM anon, authenticated;
