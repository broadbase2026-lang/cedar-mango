-- ============================================================
-- 020_fix_consume_download_token_null_embargo.sql
-- NULL embargo_until means immediately available, not "no invitation".
-- ============================================================

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
      ai.invited_user_id = v_user_id
      OR ai.invited_email = (SELECT email FROM auth.users WHERE id = v_user_id)
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::uuid, false;
    RETURN;
  END IF;

  -- NULL embargo_until = immediately available
  IF v_embargo_until IS NOT NULL AND v_embargo_until > now() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::uuid, false;
    RETURN;
  END IF;

  UPDATE download_tokens
  SET consumed_at = now()
  WHERE id = token_id;

  RETURN QUERY SELECT v_asset_id, v_asset_path, v_file_name, v_user_id, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

REVOKE EXECUTE ON FUNCTION consume_download_token(uuid)
  FROM anon, authenticated;
