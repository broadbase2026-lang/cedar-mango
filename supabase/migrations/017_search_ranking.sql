-- ============================================================
-- 017_search_ranking.sql
-- Weighted FTS + ranked journalist search RPC
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_press_release_fts()
RETURNS TRIGGER AS $$
DECLARE
  brand_name text;
BEGIN
  SELECT name INTO brand_name
  FROM brands WHERE id = NEW.brand_id;

  NEW.fts :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(brand_name, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recompute fts for existing rows (fires BEFORE UPDATE OF title trigger).
UPDATE press_releases SET title = title;

CREATE OR REPLACE FUNCTION search_press_releases(
  search_query text,
  verticals text[] DEFAULT NULL,
  published_after timestamptz DEFAULT NULL,
  sort text DEFAULT 'relevance',
  result_limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  title text,
  slug text,
  summary text,
  published_at timestamptz,
  industry_vertical text,
  brand_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    pr.id,
    pr.title,
    pr.slug,
    pr.summary,
    pr.published_at,
    pr.industry_vertical,
    pr.brand_id
  FROM press_releases pr
  CROSS JOIN LATERAL (
    SELECT websearch_to_tsquery('english', search_query) AS query
  ) q
  WHERE pr.fts @@ q.query
    AND (verticals IS NULL OR cardinality(verticals) = 0 OR pr.industry_vertical = ANY(verticals))
    AND (published_after IS NULL OR pr.published_at >= published_after)
  ORDER BY
    (CASE WHEN sort = 'relevance' THEN ts_rank_cd(pr.fts, q.query) END) DESC NULLS LAST,
    pr.published_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(result_limit, 1), 50);
$$;

REVOKE EXECUTE ON FUNCTION search_press_releases(text, text[], timestamptz, text, int)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_press_releases(text, text[], timestamptz, text, int)
  TO authenticated;
