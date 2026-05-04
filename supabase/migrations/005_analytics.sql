-- ============================================================
-- 005_analytics.sql
-- ============================================================

CREATE TABLE asset_downloads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_release_id  uuid REFERENCES press_releases(id)
                      ON DELETE CASCADE,
  press_asset_id    uuid REFERENCES press_assets(id)
                      ON DELETE CASCADE,
  brand_id          uuid REFERENCES brands(id) ON DELETE CASCADE,
  journalist_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  downloaded_at     timestamptz DEFAULT now()
);

ALTER TABLE asset_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_downloads: journalist insert"
  ON asset_downloads FOR INSERT
  WITH CHECK (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "asset_downloads: brand read"
  ON asset_downloads FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = asset_downloads.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );


CREATE TABLE release_views (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  press_release_id  uuid REFERENCES press_releases(id)
                      ON DELETE CASCADE,
  brand_id          uuid REFERENCES brands(id) ON DELETE CASCADE,
  journalist_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  viewed_at         timestamptz DEFAULT now()
);

ALTER TABLE release_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "release_views: journalist insert"
  ON release_views FOR INSERT
  WITH CHECK (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "release_views: brand read"
  ON release_views FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = release_views.brand_id
        AND brands.owner_id = (select auth.uid())
    )
  );


CREATE TABLE digest_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journalist_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at         timestamptz DEFAULT now(),
  release_ids     uuid[] DEFAULT '{}',
  opened          boolean DEFAULT false
);

ALTER TABLE digest_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "digest_sends: journalist read"
  ON digest_sends FOR SELECT
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );


CREATE TABLE chat_rate_limits (
  journalist_id   uuid NOT NULL REFERENCES profiles(id)
                    ON DELETE CASCADE,
  window_start    timestamptz NOT NULL,
  request_count   integer NOT NULL DEFAULT 1,
  PRIMARY KEY (journalist_id, window_start)
);

ALTER TABLE chat_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_rate_limits: journalist read own"
  ON chat_rate_limits FOR SELECT
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );
