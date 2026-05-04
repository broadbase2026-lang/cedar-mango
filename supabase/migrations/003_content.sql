-- ============================================================
-- 003_content.sql
-- ============================================================

-- Press releases. brand_id is the tenancy anchor.
CREATE TABLE press_releases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid REFERENCES brands(id) ON DELETE CASCADE,
  title               text NOT NULL,
  slug                text UNIQUE NOT NULL,
  body                text NOT NULL,
  summary             text CHECK (char_length(summary) <= 280),
  embargo_until       timestamptz,
  industry_vertical   text CHECK (industry_vertical IN
                        ('fnb','travel','culture','fashion',
                         'lifestyle','other')),
  tags                text[] DEFAULT '{}',
  status              text DEFAULT 'draft' CHECK (status IN
                        ('draft','published','archived')),
  featured            boolean DEFAULT false,
  ai_readiness_score  integer CHECK (
                        ai_readiness_score BETWEEN 0 AND 100),
  views_count         integer DEFAULT 0,
  downloads_count     integer DEFAULT 0,
  moderation_status   text DEFAULT 'pending' CHECK (
                        moderation_status IN
                        ('pending','approved','rejected')),
  moderation_note     text,
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES profiles(id)
                        ON DELETE SET NULL,
  published_at        timestamptz,
  deleted_at          timestamptz DEFAULT NULL,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  fts                 tsvector
);

ALTER TABLE press_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "press_releases: brand owner read"
  ON press_releases FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = press_releases.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "press_releases: brand owner insert"
  ON press_releases FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = press_releases.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "press_releases: brand owner update"
  ON press_releases FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = press_releases.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "press_releases: journalist read"
  ON press_releases FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND status = 'published'
    AND (embargo_until IS NULL OR embargo_until <= now())
    AND moderation_status IN ('pending','approved')
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
        AND user_type = 'journalist'
    )
  );

CREATE TRIGGER press_releases_updated_at
  BEFORE UPDATE ON press_releases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- Media assets attached to a press release.
CREATE TABLE press_assets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_release_id  uuid REFERENCES press_releases(id)
                      ON DELETE CASCADE,
  brand_id          uuid REFERENCES brands(id) ON DELETE CASCADE,
  file_name         text NOT NULL,
  file_url          text NOT NULL,
  file_type         text NOT NULL CHECK (file_type IN
                      ('image','pdf','video','document')),
  file_size_bytes   integer,
  caption           text,
  is_hero           boolean DEFAULT false,
  is_public         boolean DEFAULT false,
  deleted_at        timestamptz DEFAULT NULL,
  created_at        timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX press_assets_one_hero_per_release
  ON press_assets (press_release_id)
  WHERE is_hero = true AND deleted_at IS NULL;

ALTER TABLE press_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "press_assets: brand owner read"
  ON press_assets FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = press_assets.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "press_assets: brand owner insert"
  ON press_assets FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = press_assets.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "press_assets: brand owner update"
  ON press_assets FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = press_assets.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = press_assets.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );

CREATE POLICY "press_assets: journalist read"
  ON press_assets FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM press_releases pr
      WHERE pr.id = press_assets.press_release_id
        AND pr.status = 'published'
        AND (pr.embargo_until IS NULL OR pr.embargo_until <= now())
        AND pr.moderation_status IN ('pending','approved')
        AND pr.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
        AND user_type = 'journalist'
    )
  );
