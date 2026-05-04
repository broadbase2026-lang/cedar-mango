-- ============================================================
-- 007_signup_profile_trigger.sql
-- ============================================================
-- Creates public.profiles (and journalist extension row) from
-- auth.users metadata on signup. Required because RLS has no
-- INSERT policy for profiles; metadata comes from signUp options.data.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_type text;
  display_name  text;
BEGIN
  resolved_type := CASE lower(trim(COALESCE(NEW.raw_user_meta_data->>'user_type', '')))
    WHEN 'journalist' THEN 'journalist'
    ELSE 'brand'
  END;

  display_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), '');

  INSERT INTO public.profiles (id, user_type, full_name)
  VALUES (NEW.id, resolved_type, display_name);

  IF resolved_type = 'journalist' THEN
    INSERT INTO public.journalist_profiles (id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- One profile row per auth user; re-runs are not expected.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
