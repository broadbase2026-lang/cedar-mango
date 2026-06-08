-- ============================================================
-- 009_embargoed_assets.sql
-- ============================================================
-- Embargoed asset delivery system: asset-level invitations,
-- one-time-use download tokens, and server-side telemetry.
--
-- This is a separate system from the existing press_assets
-- public/private flow. Embargoed assets live in the
-- media-kits-private storage bucket and are accessed only
-- via /api/assets/download with a consumed token.

-- ============================================================
-- asset_invitations table
-- ============================================================
-- Maps individual assets to invited journalists.
-- Embargo enforcement is per-invitation, allowing the same
-- asset to have different embargo dates for different journalists.
--
-- Constraint: exactly one of invited_email or invited_user_id
-- must be set. Email is used for pre-signup invitations;
-- user_id is used for known journalists.
--
-- revoked_at: soft-delete sentinel. If not NULL, the
-- invitation is revoked and no tokens can be generated.

CREATE TABLE asset_invitations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  asset_id          uuid NOT NULL REFERENCES press_assets(id) ON DELETE CASCADE,
  invited_email     text,
  invited_user_id   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  embargo_until     timestamptz,
  created_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  revoked_at        timestamptz DEFAULT NULL,

  -- Enforce exactly one of email or user_id
  CONSTRAINT asset_invitations_email_or_user CHECK (
    (invited_email IS NOT NULL AND invited_user_id IS NULL) OR
    (invited_email IS NULL AND invited_user_id IS NOT NULL)
  )
);

-- Prevent duplicate invitations for the same email per asset
CREATE UNIQUE INDEX asset_invitations_asset_email_unique
  ON asset_invitations (asset_id, invited_email)
  WHERE invited_email IS NOT NULL AND revoked_at IS NULL;

-- Prevent duplicate invitations for the same user_id per asset
CREATE UNIQUE INDEX asset_invitations_asset_user_unique
  ON asset_invitations (asset_id, invited_user_id)
  WHERE invited_user_id IS NOT NULL AND revoked_at IS NULL;

-- Index for fast lookup when a journalist requests a token
CREATE INDEX asset_invitations_invited_user_idx
  ON asset_invitations (invited_user_id)
  WHERE revoked_at IS NULL;

CREATE INDEX asset_invitations_asset_id_idx
  ON asset_invitations (asset_id)
  WHERE revoked_at IS NULL;

ALTER TABLE asset_invitations ENABLE ROW LEVEL SECURITY;

-- Brand owner can read, insert, update, and revoke (soft-delete)
-- invitations only for assets they own.
CREATE POLICY "asset_invitations: brand owner manage"
  ON asset_invitations FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands b
      JOIN press_assets pa ON pa.brand_id = b.id
      WHERE b.owner_id = (select auth.uid())
        AND b.deleted_at IS NULL
        AND pa.id = asset_invitations.asset_id
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands b
      JOIN press_assets pa ON pa.brand_id = b.id
      WHERE b.owner_id = (select auth.uid())
        AND b.deleted_at IS NULL
        AND pa.id = asset_invitations.asset_id
    )
  );

-- Journalist can read their own invitations (discovery only).
-- Useful for showing "Exclusive assets awaiting embargo lift."
CREATE POLICY "asset_invitations: journalist read own"
  ON asset_invitations FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND revoked_at IS NULL
    AND (
      -- Match by authenticated user_id
      invited_user_id = (select auth.uid())
      OR
      -- Match by email (in case user hasn't signed up yet;
      -- the token generation endpoint validates email match)
      invited_email = (
        SELECT email FROM auth.users WHERE id = (select auth.uid())
      )
    )
  );

CREATE TRIGGER asset_invitations_updated_at
  BEFORE UPDATE ON asset_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- download_tokens table
-- ============================================================
-- Single-use, short-lived tokens. Each token ties a specific
-- user to a specific asset and expires after 1 minute.
--
-- consumed_at: NULL until the token is used. Once a token is
-- consumed (atomically by the consume_download_token function),
-- consumed_at is set and the token cannot be reused.
--
-- Indexes on expires_at and consumed_at enable fast cleanup
-- and token validity checks without full table scans.

CREATE TABLE download_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset_id    uuid NOT NULL REFERENCES press_assets(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '1 minute'),
  consumed_at timestamptz DEFAULT NULL
);

CREATE INDEX download_tokens_user_id_idx
  ON download_tokens (user_id);

-- Fast lookup for active (non-expired, non-consumed) tokens
CREATE INDEX download_tokens_valid_idx
  ON download_tokens (expires_at)
  WHERE consumed_at IS NULL AND expires_at > now();

CREATE INDEX download_tokens_asset_id_idx
  ON download_tokens (asset_id);

ALTER TABLE download_tokens ENABLE ROW LEVEL SECURITY;

-- Journalist can read their own tokens only (audit trail).
-- No INSERT from client; all inserts via service role from API.
CREATE POLICY "download_tokens: journalist read own"
  ON download_tokens FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND user_id = (select auth.uid())
  );

-- ============================================================
-- asset_download_events table
-- ============================================================
-- Server-side telemetry. One row per successful download.
-- Logged asynchronously by /api/assets/download after the
-- file stream is initiated.
--
-- Never written from client code. Service role only.
-- Brand owners query this for engagement analytics.

CREATE TABLE asset_download_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  asset_id      uuid NOT NULL REFERENCES press_assets(id) ON DELETE CASCADE,
  brand_id      uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  ip_address    inet,
  user_agent    text,
  downloaded_at timestamptz DEFAULT now()
);

CREATE INDEX asset_download_events_asset_id_idx
  ON asset_download_events (asset_id);

CREATE INDEX asset_download_events_brand_id_idx
  ON asset_download_events (brand_id);

CREATE INDEX asset_download_events_downloaded_at_idx
  ON asset_download_events (downloaded_at DESC);

-- Composite index for brand analytics queries
CREATE INDEX asset_download_events_brand_date_idx
  ON asset_download_events (brand_id, downloaded_at DESC);

ALTER TABLE asset_download_events ENABLE ROW LEVEL SECURITY;

-- Brand owner can read download events for their own assets.
-- Application layer must aggregate data; never expose
-- individual journalist identity in UI.
CREATE POLICY "asset_download_events: brand owner read"
  ON asset_download_events FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE id = asset_download_events.brand_id
        AND owner_id = (select auth.uid())
        AND deleted_at IS NULL
    )
  );

-- ============================================================
-- consume_download_token function
-- ============================================================
-- Atomic transaction: validates a token, checks embargo
-- status, verifies journalist permission, and marks the
-- token consumed in a single database round-trip.
--
-- Returns: (asset_id, asset_path, file_name, user_id, is_authorized)
-- If any check fails, is_authorized = false and other fields NULL.
--
-- SECURITY DEFINER: executes with the owner's privileges,
-- bypassing RLS. This is safe because the function validates
-- all preconditions before returning asset_path. Client code
-- cannot call this directly via REST — EXECUTE is revoked.

CREATE OR REPLACE FUNCTION consume_download_token(token_id uuid)
RETURNS TABLE(
  asset_id       uuid,
  asset_path     text,
  file_name      text,
  user_id        uuid,
  is_authorized  boolean
) AS $$
DECLARE
  v_user_id       uuid;
  v_asset_id      uuid;
  v_asset_path    text;
  v_file_name     text;
  v_file_size     integer;
  v_embargo_until timestamptz;
  v_brand_id      uuid;
BEGIN
  -- Step 1: Fetch and lock token if valid and unconsumed
  SELECT dt.user_id, dt.asset_id
  INTO v_user_id, v_asset_id
  FROM download_tokens dt
  WHERE dt.id = token_id
    AND dt.consumed_at IS NULL
    AND dt.expires_at > now()
  FOR UPDATE;

  -- Token not found, expired, or already consumed
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::uuid, false;
    RETURN;
  END IF;

  -- Step 2: Fetch asset metadata
  SELECT pa.id, pa.file_url, pa.file_name, pa.file_size_bytes, pa.brand_id
  INTO v_asset_id, v_asset_path, v_file_name, v_file_size, v_brand_id
  FROM press_assets pa
  WHERE pa.id = v_asset_id
    AND pa.deleted_at IS NULL;

  IF v_asset_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::uuid, false;
    RETURN;
  END IF;

  -- Step 3: Verify invitation exists and embargo has lifted
  SELECT ai.embargo_until
  INTO v_embargo_until
  FROM asset_invitations ai
  WHERE ai.asset_id = v_asset_id
    AND ai.revoked_at IS NULL
    AND (
      -- Match by user_id
      ai.invited_user_id = v_user_id
      OR
      -- Match by email for pre-signup invitations
      ai.invited_email = (SELECT email FROM auth.users WHERE id = v_user_id)
    )
  LIMIT 1;

  -- No invitation found
  IF v_embargo_until IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::uuid, false;
    RETURN;
  END IF;

  -- Embargo still active
  IF v_embargo_until > now() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::uuid, false;
    RETURN;
  END IF;

  -- Step 4: Mark token as consumed (atomic with the checks above)
  UPDATE download_tokens
  SET consumed_at = now()
  WHERE id = token_id;

  -- Step 5: Return asset metadata and authorization flag
  RETURN QUERY SELECT v_asset_id, v_asset_path, v_file_name, v_user_id, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- Revoke REST API access. Service role bypasses RLS and can
-- call this; anon and authenticated cannot.
REVOKE EXECUTE ON FUNCTION consume_download_token(uuid)
  FROM anon, authenticated;

-- ============================================================
-- Cleanup trigger for expired tokens (optional, post-MVP)
-- ============================================================
-- Post-MVP: scheduled job to hard-delete tokens older than 24 hours.
-- At MVP, expired tokens just sit in the table; no harm done since
-- the expires_at check prevents reuse.
--
-- CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM download_tokens
--   WHERE expires_at < now() - interval '24 hours';
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
