-- Keep press_releases.views_count in sync with release_views inserts.

CREATE OR REPLACE FUNCTION increment_release_views_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE press_releases
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = NEW.press_release_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_release_views_count()
  FROM anon, authenticated;

DROP TRIGGER IF EXISTS release_views_increment_count ON release_views;

CREATE TRIGGER release_views_increment_count
  AFTER INSERT ON release_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_release_views_count();
