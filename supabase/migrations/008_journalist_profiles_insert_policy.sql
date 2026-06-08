-- ============================================================
-- 008_journalist_profiles_insert_policy.sql
-- ============================================================

-- Allow journalists to create their own `journalist_profiles` row.
-- Required for server-action upserts on first save.
CREATE POLICY "journalist_profiles: owner insert"
  ON journalist_profiles FOR INSERT
  WITH CHECK (
    (select auth.uid()) = id
    AND auth.role() = 'authenticated'
  );

