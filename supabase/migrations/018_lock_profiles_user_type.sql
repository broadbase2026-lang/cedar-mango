-- ============================================================
-- 018_lock_profiles_user_type.sql
-- Enforce immutable profiles.user_type (comment in 001 was intent only).
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_profiles_user_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    RAISE EXCEPTION 'profiles.user_type is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_user_type_immutable ON profiles;

CREATE TRIGGER profiles_user_type_immutable
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profiles_user_type_change();
