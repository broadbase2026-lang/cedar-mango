-- ============================================================
-- 019_rls_email_webhook_events.sql
-- Service-role-only tables for Resend webhook idempotency and delivery logs.
-- ============================================================

ALTER TABLE resend_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_delivery_events ENABLE ROW LEVEL SECURITY;

-- No client policies. Service role bypasses RLS (same pattern as webhook_events).
