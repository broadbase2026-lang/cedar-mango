-- ============================================================
-- 010_journalist_portfolio.sql
-- ============================================================
-- Journalist Portfolio: bylines logged by journalists against
-- (optionally) a Broadbase press release, surfaced on a public
-- portfolio page at /journalist/[slug].
--
-- The journalist owns and controls their portfolio entirely.
-- Brand coverage visibility is a secondary, read-only benefit
-- enforced at the RLS layer (public portfolios only) and the
-- application layer (never expose journalist contact details).

-- ============================================================
-- journalist_publications table
-- ============================================================
-- One row per article a journalist claims to have published.
-- press_release_id is nullable: journalists may log articles
-- that did not originate from a Broadbase release (manual
-- portfolio entries).
-- article_url has a unique constraint: the same URL cannot
-- be claimed twice across the platform.
-- deleted_at: soft delete. No hard deletes.

CREATE TABLE journalist_publications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journalist_id       uuid NOT NULL
                        REFERENCES profiles(id) ON DELETE CASCADE,
  press_release_id    uuid
                        REFERENCES press_releases(id)
                        ON DELETE SET NULL,
  publication_name    text NOT NULL
                        CHECK (char_length(publication_name) <= 200),
  article_headline    text NOT NULL
                        CHECK (char_length(article_headline) <= 500),
  article_url         text NOT NULL
                        CHECK (char_length(article_url) <= 2000),
  published_at        timestamptz NOT NULL,
  deleted_at          timestamptz DEFAULT NULL,
  created_at          timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX journalist_publications_url_unique
  ON journalist_publications (article_url)
  WHERE deleted_at IS NULL;

CREATE INDEX journalist_publications_journalist_id_idx
  ON journalist_publications (journalist_id)
  WHERE deleted_at IS NULL;

CREATE INDEX journalist_publications_press_release_id_idx
  ON journalist_publications (press_release_id)
  WHERE deleted_at IS NULL;

ALTER TABLE journalist_publications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- journalist_portfolio_settings table
-- ============================================================
-- One row per journalist. Created automatically on journalist
-- signup alongside journalist_profiles.
-- slug is generated from full_name on creation; editable once.
-- public = false means the portfolio page returns notFound().

CREATE TABLE journalist_portfolio_settings (
  journalist_id   uuid PRIMARY KEY
                    REFERENCES profiles(id) ON DELETE CASCADE,
  slug            text UNIQUE NOT NULL
                    CHECK (
                      char_length(slug) <= 100 AND
                      slug ~ '^[a-z0-9-]+$'
                    ),
  bio             text CHECK (char_length(bio) <= 500),
  public          boolean NOT NULL DEFAULT true,
  show_email      boolean NOT NULL DEFAULT false,
  twitter_url     text CHECK (char_length(twitter_url) <= 300),
  linkedin_url    text CHECK (char_length(linkedin_url) <= 300),
  website_url     text CHECK (char_length(website_url) <= 300),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE journalist_portfolio_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER journalist_portfolio_settings_updated_at
  BEFORE UPDATE ON journalist_portfolio_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS policies: journalist_publications
-- ============================================================

-- Authenticated journalists can read their own publications
-- including soft-deleted ones (so they can see what was removed).
CREATE POLICY "journalist_publications: owner read"
  ON journalist_publications FOR SELECT
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

-- Authenticated journalists can insert their own publications.
CREATE POLICY "journalist_publications: owner insert"
  ON journalist_publications FOR INSERT
  WITH CHECK (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

-- Authenticated journalists can update their own publications
-- (headline, URL, publication name, published_at).
CREATE POLICY "journalist_publications: owner update"
  ON journalist_publications FOR UPDATE
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

-- Public read: any caller (including unauthenticated) can read
-- non-deleted publications for journalists whose portfolio is
-- set to public. This is intentional: public portfolios are
-- indexed by search engines.
CREATE POLICY "journalist_publications: public portfolio read"
  ON journalist_publications FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM journalist_portfolio_settings jps
      WHERE jps.journalist_id = journalist_publications.journalist_id
        AND jps.public = true
    )
  );

-- Brand users can read non-deleted publications for journalists
-- whose portfolio is public. This feeds the coverage data
-- visible in the brand dashboard. The application layer must
-- never expose journalist contact details to brand users.
CREATE POLICY "journalist_publications: brand read"
  ON journalist_publications FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
        AND user_type = 'brand'
    )
    AND EXISTS (
      SELECT 1 FROM journalist_portfolio_settings jps
      WHERE jps.journalist_id = journalist_publications.journalist_id
        AND jps.public = true
    )
  );

-- ============================================================
-- RLS policies: journalist_portfolio_settings
-- ============================================================

-- Owner read and update.
CREATE POLICY "journalist_portfolio_settings: owner read"
  ON journalist_portfolio_settings FOR SELECT
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "journalist_portfolio_settings: owner insert"
  ON journalist_portfolio_settings FOR INSERT
  WITH CHECK (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "journalist_portfolio_settings: owner update"
  ON journalist_portfolio_settings FOR UPDATE
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

-- Public read for public portfolios (unauthenticated allowed).
CREATE POLICY "journalist_portfolio_settings: public read"
  ON journalist_portfolio_settings FOR SELECT
  USING (public = true);
