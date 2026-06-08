-- ============================================================
-- 007_trial_mode.sql
-- ============================================================

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_mode boolean NOT NULL DEFAULT false;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_releases_used integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION enforce_trial_release_limit()
RETURNS TRIGGER AS $$
DECLARE
  is_trial      boolean;
  releases_used integer;
BEGIN
  SELECT trial_mode, trial_releases_used
    INTO is_trial, releases_used
    FROM subscriptions
   WHERE owner_id = (
     SELECT owner_id FROM brands WHERE id = NEW.brand_id
   )
   LIMIT 1;

  IF is_trial = true AND releases_used >= 1 THEN
    RAISE EXCEPTION
      'Free trial limit reached. Upgrade to publish more press releases.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER press_releases_enforce_trial_limit
  BEFORE INSERT ON press_releases
  FOR EACH ROW EXECUTE FUNCTION enforce_trial_release_limit();

REVOKE EXECUTE ON FUNCTION enforce_trial_release_limit()
  FROM anon, authenticated;

