-- RLS smoke tests — run in a Supabase SQL session with test fixtures
-- after applying migrations. Adjust UUIDs and setup to match your seed.

-- A journalist cannot SELECT a draft press_release
-- (expect 0 rows when SET ROLE authenticated as journalist user)

-- A journalist cannot SELECT an embargoed press_release
-- (embargo_until > now())

-- A journalist cannot SELECT a rejected press_release
-- (moderation_status = 'rejected')

-- A journalist cannot SELECT a soft-deleted press_release
-- (deleted_at IS NOT NULL)

-- A journalist cannot SELECT another user's subscription

-- A brand cannot SELECT another brand's analytics rows
-- (asset_downloads / release_views for foreign brand_id)

-- A journalist cannot SELECT another journalist's folders

-- A journalist cannot SELECT chat_rate_limits rows that are not their own

-- An anonymous caller cannot SELECT any row from profiles

-- An anonymous caller cannot SELECT any row from brands

-- A brand cannot call enforce_brand_limit() via REST
-- GET /rest/v1/rpc/enforce_brand_limit → 404 or 403

-- A duplicate Stripe event ID insert is rejected with unique violation (23505)
-- INSERT INTO webhook_events (stripe_event_id) VALUES ('evt_test') twice
