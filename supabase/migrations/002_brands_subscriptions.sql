-- ============================================================
-- 002_brands_subscriptions.sql
-- ============================================================

-- One row per brand. slug is used in public URLs.
-- slug must be URL-safe, unique, and immutable after first publish.
CREATE TABLE brands (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  slug                text UNIQUE NOT NULL,
  description         text,
  website             text,
  logo_url            text,
  industry_vertical   text CHECK (industry_vertical IN
                        ('fnb','travel','culture','fashion',
                         'lifestyle','other')),
  verified            boolean DEFAULT false,
  deleted_at          timestamptz DEFAULT NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands: owner read"
  ON brands FOR SELECT
  USING (
    (select auth.uid()) = owner_id
    AND auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

CREATE POLICY "brands: owner insert"
  ON brands FOR INSERT
  WITH CHECK (
    (select auth.uid()) = owner_id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "brands: owner update"
  ON brands FOR UPDATE
  USING (
    (select auth.uid()) = owner_id
    AND auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

CREATE POLICY "brands: journalist read"
  ON brands FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
        AND user_type = 'journalist'
    )
  );


-- One subscription per owner. Synced exclusively from Stripe
-- webhooks using the service role key.
-- Never write to this table from client-side code.
CREATE TABLE subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id      text UNIQUE NOT NULL,
  stripe_subscription_id  text UNIQUE,
  plan                    text NOT NULL CHECK (plan IN
                            ('starter','pro','agency')),
  status                  text NOT NULL CHECK (status IN
                            ('active','canceled','past_due',
                             'trialing')),
  current_period_end      timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: owner read"
  ON subscriptions FOR SELECT
  USING (
    (select auth.uid()) = owner_id
    AND auth.role() = 'authenticated'
  );

CREATE UNIQUE INDEX subscriptions_owner_id_active
  ON subscriptions (owner_id)
  WHERE status IN ('active','trialing');


-- Idempotency table for Stripe webhook events.
-- Prevents duplicate processing on Stripe retries and replay
-- attacks. One row per event ID — primary key enforces uniqueness.
-- Written exclusively by the webhook handler via service role.
-- No client access of any kind.
CREATE TABLE webhook_events (
  stripe_event_id  text PRIMARY KEY,
  processed_at     timestamptz DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No SELECT, INSERT, UPDATE, or DELETE policies.
-- Service role bypasses RLS by design — that is the only
-- caller permitted.


-- Shared updated_at trigger function.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- Brand-limit enforcement trigger.
-- First brand allowed without active/trialing subscription; further
-- brands require an active subscription and tier limits apply.
CREATE OR REPLACE FUNCTION enforce_brand_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  tier_limit    integer;
  plan_name     text;
BEGIN
  SELECT plan INTO plan_name
  FROM subscriptions
  WHERE owner_id = NEW.owner_id
    AND status IN ('active','trialing')
  LIMIT 1;

  IF plan_name IS NULL THEN
    SELECT COUNT(*) INTO current_count
    FROM brands
    WHERE owner_id = NEW.owner_id
      AND deleted_at IS NULL;

    IF current_count >= 1 THEN
      RAISE EXCEPTION
        'You must have an active subscription to create more brands.';
    END IF;

    RETURN NEW;
  END IF;

  tier_limit := CASE plan_name
    WHEN 'starter' THEN 1
    WHEN 'pro'     THEN 10
    WHEN 'agency'  THEN NULL
    ELSE 0
  END;

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
      plan_name, tier_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER brands_enforce_limit
  BEFORE INSERT ON brands
  FOR EACH ROW EXECUTE FUNCTION enforce_brand_limit();


-- Revoke public REST API access to all functions defined
-- in this file. PostgREST exposes all public schema functions
-- via /rest/v1/rpc/ by default.
REVOKE EXECUTE ON FUNCTION update_updated_at()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION enforce_brand_limit()
  FROM anon, authenticated;
