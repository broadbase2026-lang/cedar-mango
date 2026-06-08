-- ============================================================
-- 011_journalist_portfolio_signup.sql
-- ============================================================
-- Extends handle_new_user() so that every new journalist also
-- gets a journalist_portfolio_settings row, created atomically
-- in the same transaction as their journalist_profiles row.
--
-- This runs for ALL signups (including the email-confirmation
-- flow, where the application-layer signup action returns early
-- before any post-signup code executes). SECURITY DEFINER means
-- the slug uniqueness check sees every row regardless of RLS —
-- the in-database equivalent of an admin-client check.
--
-- Slug generation mirrors lib/utils/generateSlug.ts:
--   lowercase -> non-alphanumerics to hyphens -> collapse
--   repeats -> trim leading/trailing hyphens. On collision,
--   append -2, -3, ... up to -99, then a random 4-char hex.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_type text;
  display_name  text;
  v_base        text;
  v_slug        text;
  v_i           integer := 2;
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

    v_base := regexp_replace(lower(COALESCE(display_name, '')), '[^a-z0-9]+', '-', 'g');
    v_base := regexp_replace(v_base, '-{2,}', '-', 'g');
    v_base := regexp_replace(v_base, '^-|-$', '', 'g');

    -- Fallback when the name yields no usable slug.
    IF v_base = '' THEN
      v_base := 'journalist';
    END IF;

    -- Keep room under the 100-char slug limit for any suffix.
    v_base := regexp_replace(left(v_base, 90), '-$', '', 'g');
    IF v_base = '' THEN
      v_base := 'journalist';
    END IF;

    v_slug := v_base;

    WHILE EXISTS (
      SELECT 1 FROM public.journalist_portfolio_settings WHERE slug = v_slug
    ) LOOP
      IF v_i > 99 THEN
        v_slug := v_base || '-' || substr(md5(random()::text), 1, 4);
        EXIT;
      END IF;
      v_slug := v_base || '-' || v_i;
      v_i := v_i + 1;
    END LOOP;

    INSERT INTO public.journalist_portfolio_settings (journalist_id, slug)
    VALUES (NEW.id, v_slug);
  END IF;

  RETURN NEW;
END;
$$;
