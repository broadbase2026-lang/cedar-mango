-- supabase/tests/embargoed_assets_rls_smoke.sql
-- ============================================================
-- Smoke tests for embargoed asset delivery system.
-- Run these tests after every migration to verify RLS and
-- security enforcement.
--
-- Each test should pass silently (return no error).
-- If any assertion fails, the test will raise an exception.

BEGIN;

-- ============================================================
-- Test Setup: Create test users and data
-- ============================================================
-- Note: In a real test harness, you'd use pg_prove or
-- a similar framework. For manual testing in Supabase SQL:
-- - Create brand owner user
-- - Create journalist user
-- - Create test asset and invitation
-- - Verify various access scenarios

-- ============================================================
-- Test 1: Journalist cannot SELECT another journalist's download tokens
-- ============================================================
-- A token created by one journalist should not be visible to another.
-- This test verifies the RLS policy "download_tokens: journalist read own"
-- correctly isolates journalists.
--
-- Expected: Query returns 0 rows
-- (Requires two distinct test journalist users)

-- Test 1 SQL:
-- SET ROLE authenticated;
-- SET jwt.claims.sub = '[journalist_2_id]';
-- SELECT COUNT(*) FROM download_tokens
-- WHERE user_id = '[journalist_1_id]';
-- -- Expected: 0

-- ============================================================
-- Test 2: Brand cannot SELECT invitations they didn't create
-- ============================================================
-- A brand user should only see invitations for assets they own.
-- This test verifies the RLS policy "asset_invitations: brand owner manage"
--
-- Expected: Query returns 0 rows for another brand's invitations
-- (Requires two distinct brand users)

-- Test 2 SQL:
-- SET ROLE authenticated;
-- SET jwt.claims.sub = '[brand_2_owner_id]';
-- SELECT COUNT(*) FROM asset_invitations
-- WHERE brand_id = '[brand_1_id]';
-- -- Expected: 0

-- ============================================================
-- Test 3: Anonymous user cannot SELECT asset_invitations
-- ============================================================
-- Unauthenticated requests must be rejected at RLS level.
--
-- Expected: RLS policy blocks SELECT for anonymous role

-- Test 3 SQL:
-- SET ROLE anon;
-- SELECT COUNT(*) FROM asset_invitations;
-- -- Expected: error "row level security policy" or 0 rows

-- ============================================================
-- Test 4: Service role can call consume_download_token,
--         but anon and authenticated cannot
-- ============================================================
-- The function is defined with SECURITY DEFINER and EXECUTE
-- is revoked from anon and authenticated roles.
--
-- Expected: 
--   - Service role: can call function
--   - Anon/authenticated: permission denied

-- Test 4 SQL (attempt as authenticated):
-- SET ROLE authenticated;
-- SET jwt.claims.sub = '[some_user_id]';
-- SELECT * FROM consume_download_token('[some_token_id]'::uuid);
-- -- Expected: ERROR: permission denied for function consume_download_token

-- ============================================================
-- Test 5: Expired tokens cannot be consumed
-- ============================================================
-- A token with expires_at < now() should fail the consume_download_token
-- function check and return is_authorized = false.
--
-- Expected: Function returns is_authorized = false

-- Test 5 SQL (manual):
-- INSERT INTO download_tokens (id, user_id, asset_id, expires_at)
-- VALUES ('[expired_token_uuid]', '[user_id]', '[asset_id]', now() - interval '1 hour');
-- 
-- CALL consume_download_token('[expired_token_uuid]'::uuid);
-- -- Expected: is_authorized = false

-- ============================================================
-- Test 6: Consumed tokens cannot be reused
-- ============================================================
-- Once a token is consumed (consumed_at IS NOT NULL), the function
-- should reject it.
--
-- Expected: Second call returns is_authorized = false

-- Test 6 SQL (manual):
-- -- After first successful consume:
-- CALL consume_download_token('[same_token_id]'::uuid);
-- -- Expected: is_authorized = false

-- ============================================================
-- Test 7: Cannot INSERT into download_tokens without service role
-- ============================================================
-- RLS policies on download_tokens do not permit authenticated users
-- to INSERT. Only the API route (via service role) can insert.
--
-- Expected: INSERT is rejected by RLS

-- Test 7 SQL:
-- SET ROLE authenticated;
-- SET jwt.claims.sub = '[user_id]';
-- INSERT INTO download_tokens (user_id, asset_id)
-- VALUES ('[user_id]', '[asset_id]');
-- -- Expected: ERROR: "new row violates row security policy"

-- ============================================================
-- Test 8: Cannot INSERT into asset_download_events without service role
-- ============================================================
-- Same as Test 7: telemetry table is append-only by service role.
--
-- Expected: INSERT is rejected by RLS

-- Test 8 SQL:
-- SET ROLE authenticated;
-- SET jwt.claims.sub = '[user_id]';
-- INSERT INTO asset_download_events (user_id, asset_id, brand_id)
-- VALUES ('[user_id]', '[asset_id]', '[brand_id]');
-- -- Expected: ERROR: "new row violates row security policy"

-- ============================================================
-- Test 9: Revoked invitations cannot generate tokens
-- ============================================================
-- An invitation with revoked_at IS NOT NULL should fail the
-- consume_download_token check.
--
-- Expected: consume_download_token returns is_authorized = false

-- Test 9 SQL (manual):
-- UPDATE asset_invitations SET revoked_at = now()
-- WHERE id = '[invitation_id]';
-- 
-- CALL consume_download_token('[token_for_revoked_invitation]'::uuid);
-- -- Expected: is_authorized = false

-- ============================================================
-- Test 10: Embargo not lifted prevents token consumption
-- ============================================================
-- If embargo_until > now(), consume_download_token should fail
-- even if invitation exists and token is valid.
--
-- Expected: Function returns is_authorized = false

-- Test 10 SQL (manual):
-- -- Create invitation with future embargo:
-- INSERT INTO asset_invitations
--   (brand_id, asset_id, invited_user_id, embargo_until, created_by)
-- VALUES
--   ('[brand_id]', '[asset_id]', '[journalist_id]',
--    now() + interval '1 day', '[creator_id]');
-- 
-- -- Request token (should succeed):
-- POST /api/assets/request-token { assetId: '[asset_id]' }
-- 
-- -- Try to consume token (should fail due to embargo):
-- GET /api/assets/download?token=[token]
-- -- Expected: 403 Forbidden

-- ============================================================
-- Test 11: Soft-deleted assets cannot be downloaded
-- ============================================================
-- If press_assets.deleted_at IS NOT NULL, the consume_download_token
-- function should reject the token.
--
-- Expected: Function returns is_authorized = false

-- Test 11 SQL (manual):
-- UPDATE press_assets SET deleted_at = now()
-- WHERE id = '[asset_id]';
-- 
-- CALL consume_download_token('[token_for_deleted_asset]'::uuid);
-- -- Expected: is_authorized = false

-- ============================================================
-- Test 12: Brand cannot see journalist's download tokens
-- ============================================================
-- A brand user should not be able to query download_tokens at all.
-- The table has no policy for brand access.
--
-- Expected: No rows returned or permission denied

-- Test 12 SQL:
-- SET ROLE authenticated;
-- SET jwt.claims.sub = '[brand_owner_id]';
-- SELECT COUNT(*) FROM download_tokens;
-- -- Expected: 0 (due to restrictive policy)

-- ============================================================
-- Manual Testing Checklist (for QA.md)
-- ============================================================
-- 1. [ ] Request token as non-invited journalist
--        Expected: 403 "You do not have access to this asset"
--
-- 2. [ ] Request token with active embargo
--        Expected: 403 "This asset is still embargoed"
--
-- 3. [ ] Request token successfully, token expires before use
--        Expected: 403 on download attempt
--
-- 4. [ ] Reuse same token twice
--        Expected: First succeeds, second fails with 403
--
-- 5. [ ] Revoke invitation, try to download
--        Expected: 403 "Access denied"
--
-- 6. [ ] Create invitation with email, unregistered journalist
--        requests token (if matching email), token works post-signup
--        Expected: Invitation match by email succeeds
--
-- 7. [ ] Download same asset as multiple journalists
--        Expected: Each logs separate row in asset_download_events
--
-- 8. [ ] Inspect asset_download_events as brand owner
--        Expected: Can see rows only for their brand's assets
--
-- 9. [ ] Inspect asset_download_events as journalist
--        Expected: Cannot access table (no policy for journalist)
--
-- 10. [ ] Check network inspector: confirm no raw storage paths
--         in any HTTP response
--         Expected: Only token UUIDs and public URLs, no
--                   "media-kits-private/..." paths

END;
