-- ============================================================
-- 012_brand_profile_governance.sql
-- Agency plan brand-name change audit + Stripe metadata sync
-- ============================================================

ALTER TABLE brands
  ADD COLUMN needs_manual_audit boolean NOT NULL DEFAULT false,
  ADD COLUMN audit_flagged_at timestamptz,
  ADD COLUMN audit_reason text;

CREATE TABLE brand_name_changes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_name    text NOT NULL,
  new_name    text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX brand_name_changes_owner_changed_at_idx
  ON brand_name_changes (owner_id, changed_at);

ALTER TABLE brand_name_changes ENABLE ROW LEVEL SECURITY;

-- Owners can read their own name-change history (settings transparency).
CREATE POLICY "brand_name_changes: owner read"
  ON brand_name_changes FOR SELECT
  USING (
    (select auth.uid()) = owner_id
    AND auth.role() = 'authenticated'
  );

-- Writes are server-side only (service role); no client insert policy.
