-- ============================================================
-- 015_secure_definer_search_path.sql
-- ============================================================
-- Hardening: pin search_path on SECURITY DEFINER trigger functions.
--
-- A SECURITY DEFINER function runs with the privileges of its owner
-- (typically a superuser/postgres role). If search_path is not fixed,
-- a caller who can create objects in a schema earlier on the resolved
-- search_path could shadow built-in functions/tables and have them
-- executed with elevated privileges. Pinning search_path to a known,
-- trusted set closes that vector.
--
-- handle_new_user(), consume_download_token() already set search_path;
-- these two trigger functions did not.

ALTER FUNCTION public.enforce_brand_limit() SET search_path = public;
ALTER FUNCTION public.enforce_trial_release_limit() SET search_path = public;
