-- ============================================================
-- 001_auth_profiles.sql
-- ============================================================

-- Extends auth.users. Created immediately on signup for both
-- user types. user_type is immutable after creation.
CREATE TABLE profiles (
  id          uuid REFERENCES auth.users PRIMARY KEY,
  user_type   text NOT NULL CHECK (user_type IN ('brand','journalist')),
  full_name   text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- (select auth.uid()) is mandatory — never auth.uid() directly.
-- auth.role() = 'authenticated' blocks anonymous probing.
CREATE POLICY "profiles: owner read"
  ON profiles FOR SELECT
  USING (
    (select auth.uid()) = id
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (
    (select auth.uid()) = id
    AND auth.role() = 'authenticated'
  );
