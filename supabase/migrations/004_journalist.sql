-- ============================================================
-- 004_journalist.sql
-- ============================================================

CREATE TABLE journalist_profiles (
  id                  uuid REFERENCES profiles(id)
                        ON DELETE CASCADE PRIMARY KEY,
  publication         text,
  beats               text[] DEFAULT '{}',
  bio                 text,
  linkedin_url        text,
  digest_subscribed   boolean DEFAULT true,
  digest_frequency    text DEFAULT 'daily' CHECK (
                        digest_frequency IN
                        ('daily','weekly','never')),
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE journalist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journalist_profiles: owner read"
  ON journalist_profiles FOR SELECT
  USING (
    (select auth.uid()) = id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "journalist_profiles: owner update"
  ON journalist_profiles FOR UPDATE
  USING (
    (select auth.uid()) = id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "journalist_profiles: brand read"
  ON journalist_profiles FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid())
        AND user_type = 'brand'
    )
  );


CREATE TABLE journalist_follows (
  journalist_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id        uuid REFERENCES brands(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  PRIMARY KEY (journalist_id, brand_id)
);

ALTER TABLE journalist_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journalist_follows: journalist manage"
  ON journalist_follows FOR ALL
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );


CREATE TABLE journalist_folders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journalist_id   uuid NOT NULL REFERENCES profiles(id)
                    ON DELETE CASCADE,
  name            text NOT NULL CHECK (char_length(name) <= 100),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX journalist_folders_journalist_name_unique
  ON journalist_folders (journalist_id, name);

ALTER TABLE journalist_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journalist_folders: owner all"
  ON journalist_folders FOR ALL
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

CREATE TRIGGER journalist_folders_updated_at
  BEFORE UPDATE ON journalist_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


CREATE TABLE journalist_folder_releases (
  folder_id         uuid NOT NULL REFERENCES journalist_folders(id)
                      ON DELETE CASCADE,
  press_release_id  uuid NOT NULL REFERENCES press_releases(id)
                      ON DELETE CASCADE,
  journalist_id     uuid NOT NULL REFERENCES profiles(id)
                      ON DELETE CASCADE,
  saved_at          timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  PRIMARY KEY (folder_id, press_release_id)
);

ALTER TABLE journalist_folder_releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journalist_folder_releases: owner all"
  ON journalist_folder_releases FOR ALL
  USING (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    (select auth.uid()) = journalist_id
    AND auth.role() = 'authenticated'
  );

CREATE TRIGGER journalist_folder_releases_updated_at
  BEFORE UPDATE ON journalist_folder_releases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
