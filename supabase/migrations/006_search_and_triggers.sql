-- ============================================================
-- 006_search_and_triggers.sql
-- ============================================================

CREATE OR REPLACE FUNCTION refresh_press_release_fts()
RETURNS TRIGGER AS $$
DECLARE
  brand_name text;
BEGIN
  SELECT name INTO brand_name
  FROM brands WHERE id = NEW.brand_id;

  NEW.fts := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.body, '') || ' ' ||
    coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
    coalesce(brand_name, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER press_releases_fts_update
  BEFORE INSERT OR UPDATE OF title, body, tags, brand_id
  ON press_releases
  FOR EACH ROW EXECUTE FUNCTION refresh_press_release_fts();

REVOKE EXECUTE ON FUNCTION refresh_press_release_fts()
  FROM anon, authenticated;

CREATE INDEX press_releases_fts_idx
  ON press_releases USING gin(fts);

CREATE INDEX press_releases_brand_id_idx
  ON press_releases (brand_id);

CREATE INDEX press_releases_status_published_at_idx
  ON press_releases (status, published_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX press_releases_vertical_idx
  ON press_releases (industry_vertical)
  WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX press_assets_press_release_id_idx
  ON press_assets (press_release_id);

CREATE INDEX asset_downloads_brand_id_idx
  ON asset_downloads (brand_id);

CREATE INDEX release_views_brand_id_idx
  ON release_views (brand_id);

CREATE INDEX journalist_folder_releases_journalist_id_idx
  ON journalist_folder_releases (journalist_id);

CREATE INDEX journalist_folder_releases_folder_id_idx
  ON journalist_folder_releases (folder_id);

CREATE INDEX journalist_folder_releases_press_release_id_idx
  ON journalist_folder_releases (press_release_id);


-- ============================================================
-- Storage buckets and policies (press-assets-public / private)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('press-assets-public', 'press-assets-public', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('press-assets-private', 'press-assets-private', false)
ON CONFLICT (id) DO NOTHING;

-- press-assets-public: world-readable objects
CREATE POLICY "storage_press_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'press-assets-public');

CREATE POLICY "storage_press_public_insert_brand"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'press-assets-public'
    AND (select auth.uid()) IS NOT NULL
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.user_type = 'brand'
    )
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );

CREATE POLICY "storage_press_public_update_brand"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'press-assets-public'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'press-assets-public'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );

CREATE POLICY "storage_press_public_delete_brand"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'press-assets-public'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );

-- press-assets-private: no direct SELECT; signed URLs via service role
CREATE POLICY "storage_press_private_insert_brand"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'press-assets-private'
    AND (select auth.uid()) IS NOT NULL
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
        AND profiles.user_type = 'brand'
    )
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );

CREATE POLICY "storage_press_private_update_brand"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'press-assets-private'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'press-assets-private'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );

CREATE POLICY "storage_press_private_delete_brand"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'press-assets-private'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );
