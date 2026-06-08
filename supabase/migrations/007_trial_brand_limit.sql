-- ============================================================
-- 007_trial_brand_limit.sql
-- ============================================================
--
-- Trial enforcement must live in application logic, but the brand-limit trigger is
-- a hard security control. Without this update, trial users (no active subscription)
-- can be incorrectly blocked from creating their first brand workspace.
--
-- This change keeps the security posture: trial users get the same 1-brand limit as
-- the Solo tier, only within the first 14 days of account creation.

CREATE OR REPLACE FUNCTION enforce_brand_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  tier_limit    integer;
  plan_name     text;
  account_age   interval;
BEGIN
  SELECT plan INTO plan_name
  FROM subscriptions
  WHERE owner_id = NEW.owner_id
    AND status IN ('active','trialing')
  LIMIT 1;

  -- Trial: no active subscription, account ≤14 days old → allow 1 brand
  IF plan_name IS NULL THEN
    SELECT now() - created_at INTO account_age
    FROM profiles WHERE id = NEW.owner_id;

    IF account_age <= interval '14 days' THEN
      tier_limit := 1;
    ELSE
      tier_limit := 0;
    END IF;
  ELSE
    tier_limit := CASE plan_name
      WHEN 'starter' THEN 1
      WHEN 'pro'     THEN 10
      WHEN 'agency'  THEN NULL
      ELSE 0
    END;
  END IF;

  IF tier_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM brands
  WHERE owner_id = NEW.owner_id
    AND deleted_at IS NULL;

  IF current_count >= tier_limit THEN
    RAISE EXCEPTION
      'Brand limit reached for plan %. Limit is %.',
      COALESCE(plan_name,'trial'), tier_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION enforce_brand_limit()
  FROM anon, authenticated;

