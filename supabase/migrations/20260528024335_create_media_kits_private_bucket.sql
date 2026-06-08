-- ============================================================
-- media-kits-private storage bucket (embargoed asset delivery)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media-kits-private', 'media-kits-private', false)
ON CONFLICT (id) DO NOTHING;

-- Brand owners upload embargoed assets under {brand_id}/...
CREATE POLICY "storage_media_kits_private_insert_brand"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media-kits-private'
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

CREATE POLICY "storage_media_kits_private_update_brand"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media-kits-private'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  )
  WITH CHECK (
    bucket_id = 'media-kits-private'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );

CREATE POLICY "storage_media_kits_private_delete_brand"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media-kits-private'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.owner_id = (select auth.uid())
        AND brands.deleted_at IS NULL
        AND (storage.foldername(name))[1] = brands.id::text
    )
  );

-- No public SELECT; downloads go through /api/assets/download with service role.
