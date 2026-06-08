# QA — manual checklist

## Pre-launch configuration

## Brand flows

- [ ] Attempt to publish a 5th release on Solo plan → confirm limit error
- [ ] Attempt to publish a 21st release on Growth plan → confirm limit error
- [ ] Confirm Enterprise plan has no publish limit
- [ ] Attempt to create an 11th brand on Growth plan → confirm limit error
- [ ] Confirm Enterprise plan has no brand limit
- [ ] Upload assets until storage limit is reached → confirm 413 with correct message
- [ ] Attempt to use embargo on Solo plan → confirm 403 with correct message
- [ ] Attempt to call `/api/ai` as a Solo user → confirm 403 with correct message
- [ ] Confirm AI Readiness Score displays without suggestions on Solo dashboard
- [ ] Confirm suggestions panel shows locked state with upgrade prompt on Solo
- [ ] Confirm CSV export button visible on Enterprise analytics page
- [ ] Confirm CSV export returns 403 for Growth and Solo users

## Free trial signup flow

- [ ] Unauthenticated user clicks "Start Free Trial" on `/pricing`
  - [ ] Redirects to `/signup?trial=true`
  - [ ] Signup page shows contextual banner: "You're signing up for a free trial..." 
- [ ] Complete signup with email, password, full_name (brand)
  - [ ] `profiles` row created with `user_type = 'brand'`
  - [ ] `brands` row created with correct slug
  - [ ] `subscriptions` row created with:
    - [ ] `plan = 'starter'`
    - [ ] `status = 'trialing'`
    - [ ] `trial_mode = true`
    - [ ] `trial_releases_used = 0`
    - [ ] `stripe_customer_id` starts with `'trial_'` (placeholder)
  - [ ] Redirects to `/brand/upload?trial=true`
  - [ ] Upload page shows trial banner: "You're on a free trial..."

## Free trial upload and limit enforcement

- [ ] Brand on trial publishes a press release (first publish)
  - [ ] Publish succeeds
  - [ ] `trial_releases_used` incremented to 1 in `subscriptions`
  - [ ] No Stripe charge
- [ ] Brand on trial attempts to publish a second press release
  - [ ] Upload page gate shows upgrade prompt instead of form
  - [ ] Prompt reads: "You've used your free press release"
  - [ ] "View Pricing" button links to `/pricing`
  - [ ] "Back to Dashboard" button links to `/dashboard/brand`
  - [ ] (Alternatively: if user bypasses UI and calls `/api/press-releases/publish` directly with a second press release)
    - [ ] API returns `{ success: false, error: 'upgrade_required', data: { redirectTo: '/pricing?reason=release-limit' } }`
    - [ ] No additional publish occurs
    - [ ] Postgres trigger also blocks the insert with exception

## Free trial — additional brand creation limit

- [ ] Brand on trial attempts to create a second brand via settings / "Create workspace"
  - [ ] Redirects to `/pricing?reason=trial_brand_limit`
  - [ ] Pricing page shows inline notice above the free trial banner: "You've reached the brand limit on your free trial..."
  - [ ] "Start Free Trial" button reads "Continue Trial" if user is already on a trial
  - [ ] (Alternatively: if user calls brand creation directly)
    - [ ] Insert is blocked
    - [ ] No row inserted in `brands`
    - [ ] Postgres trigger `enforce_brand_limit` also blocks the insert

## Free trial — existing user entry point

- [ ] Authenticated brand user with no active subscription views `/pricing`
  - [ ] Pricing page shows free trial banner with "Start Free Trial"
- [ ] Clicks "Start Free Trial"
  - [ ] Trial subscription is created if missing (or reused if it already exists)
  - [ ] Redirects to `/brand/upload?trial=true`
  - [ ] Upload page renders the form (if this is the first trial publish)
- [ ] If user is already on an active trial, "Start Free Trial" button reads "Continue Trial" instead

## Pricing page — plan buttons by auth state

- [ ] **Unauthenticated user**
  - [ ] All three "Get Started" buttons link to `/signup?plan=PLAN_NAME` (starter/pro/agency)
  - [ ] Free trial banner is visible: "Not ready to commit? Start with a free press release..."
  - [ ] "Start Free Trial" button links to `/signup?trial=true`

- [ ] **Authenticated brand user on no subscription**
  - [ ] All three "Get Started" buttons trigger the `createCheckoutSession` server action
  - [ ] Clicking a button initiates Stripe checkout session creation
  - [ ] Redirects to Stripe Checkout page
  - [ ] Free trial banner is visible with "Start Free Trial" button
  - [ ] Clicking "Start Free Trial" redirects to `/brand/upload?trial=true`

- [ ] **Authenticated brand user on an active subscription (e.g., Growth plan)**
  - [ ] The Growth card button reads "Current Plan" and is disabled
  - [ ] The Solo card button reads "Downgrade" and is clickable
  - [ ] The Enterprise card button reads "Upgrade" and is clickable
  - [ ] Free trial banner is hidden (not visible to paying users)

- [ ] **Authenticated brand user on a trial**
  - [ ] "Start Free Trial" button on the pricing page reads "Continue Trial"
  - [ ] Clicking "Continue Trial" redirects to `/brand/upload?trial=true`

- [ ] **Authenticated journalist user**
  - [ ] All three "Get Started" buttons are disabled
  - [ ] Button has a `title` attribute: "Subscription not available for journalist accounts"
  - [ ] Free trial banner is hidden (not relevant to journalists)

## Stripe webhook — trial to paid upgrade

- [ ] Brand on trial with `trial_mode = true` and `trial_releases_used = 1` upgrades via Stripe Checkout
  - [ ] Completes Stripe payment successfully
  - [ ] Stripe sends `customer.subscription.created` or `customer.subscription.updated` event with `status = 'active'`
  - [ ] Webhook handler receives event, verifies signature, checks idempotency against `webhook_events`
  - [ ] `subscriptions` row is updated:
    - [ ] `status = 'active'`
    - [ ] `plan` matches the purchased plan
    - [ ] `trial_mode = false` (cleared)
    - [ ] `trial_releases_used` remains 1 (not reset)
  - [ ] Brand user views `/brand/upload`
    - [ ] Upload form renders (no more gate)
    - [ ] Trial banner is gone
    - [ ] Brand can now publish unlimited press releases
  - [ ] Dashboard shows active plan and renewal date

## Trial state transitions — edge cases

- [ ] Brand creates an account with trial, publishes press release (`trial_releases_used = 1`)
  - [ ] Soft-deletes the press release (sets `deleted_at` manually in Supabase dashboard)
  - [ ] Attempts to publish a second press release
    - [ ] **Expected**: Still blocked — trial limit is based on releases attempted, not published/visible
    - [ ] If this should be different (count only non-deleted), clarify before implementation

- [ ] Brand on trial upgrades to Growth plan
  - [ ] Attempts to downgrade back to trial at some point (edge case — may not have UI for this post-MVP)
    - [ ] Should this be prevented? Clarify before implementation

- [ ] Trial brand attempts to create a second brand, sees redirect to `/pricing?reason=trial_brand_limit`
  - [ ] "Start Free Trial" button on pricing page is now hidden or reads "Continue Trial"
  - [ ] User can upgrade to any paid plan to unlock additional brands

## Database state — trial verification queries

Run these after a full trial → upgrade flow to verify data integrity:

```sql
-- Verify a trial user has the correct subscription state
SELECT id, owner_id, trial_mode, trial_releases_used, plan, status
FROM subscriptions
WHERE owner_id = 'YOUR_USER_ID_HERE';

-- Expected: trial_mode = true, trial_releases_used = 0 or 1, status = 'trialing'
-- After upgrade: trial_mode = false, status = 'active'

-- Verify press_releases count matches trial_releases_used
SELECT COUNT(*) as release_count
FROM press_releases
WHERE brand_id IN (
  SELECT id FROM brands WHERE owner_id = 'YOUR_USER_ID_HERE'
)
AND deleted_at IS NULL;

-- Expected: on trial, should be 0 or 1; after upgrade, can be > 1

-- Verify webhook event idempotency
SELECT COUNT(*) as event_count, stripe_event_id
FROM webhook_events
GROUP BY stripe_event_id
HAVING COUNT(*) > 1;

-- Expected: zero rows (all stripe_event_id values are unique)
```

## Postgres trigger validation

- [ ] Manually insert a row into `press_releases` for a trial brand with `trial_releases_used = 1`:
  - [ ] Postgres trigger `enforce_trial_release_limit` blocks the insert
  - [ ] Error message: "Free trial limit reached. Upgrade to publish more press releases."

- [ ] Manually insert a second row into `brands` for a trial user:
  - [ ] Postgres trigger `enforce_brand_limit` blocks the insert
  - [ ] Error message: "Brand limit reached for plan..."

## API security — trial checks

- [ ] Call `/api/press-releases/publish` directly as a trial user with `trial_releases_used = 1`:
  - [ ] Request is blocked before Postgres trigger is reached
  - [ ] Returns `{ success: false, error: 'upgrade_required', data: { redirectTo: '/pricing?reason=release-limit' } }`

- [ ] Call the brand creation flow as a trial user:
  - [ ] Request is blocked before Postgres trigger is reached
  - [ ] Redirects to `/pricing?reason=trial_brand_limit`

- [ ] Call `/api/webhooks/stripe` with a duplicate Stripe event ID:
  - [ ] Webhook handler checks `webhook_events` for idempotency
  - [ ] Returns `{ received: true }` with status 200
  - [ ] No duplicate row inserted in `subscriptions`

## Homepage navigation

- [ ] All public pages (including `/pricing`) show the "Pricing" link in the nav bar
- [ ] Clicking "Pricing" from any page navigates to `/pricing`
- [ ] The "Pricing" link is active (styled with primary teal) when on `/pricing`
- [ ] Mobile menu includes the "Pricing" link and is functional on small screens

## Journalist flows

## Embargo flow

### Upload and publish flow

- [ ] Solo user: confirm embargo date picker is not rendered in the publish UI
- [ ] Solo user: attempt to POST to publish API with `embargo_until` in request body → confirm 403
- [ ] Growth/Enterprise user: confirm embargo datetime input renders with correct min (now + 15 min) and max (12 months) values
- [ ] Set embargo 1 hour in future → publish → confirm release shows "Embargoed" badge on dashboard with correct lift time
- [ ] Confirm published embargoed release returns 404 on public release page `/release/[slug]`
- [ ] Confirm published embargoed release does not appear on public newsroom page `/newsroom/[brand-slug]`
- [ ] Confirm embargoed release does not appear in journalist discover feed
- [ ] Confirm embargoed release does not appear in journalist search results
- [ ] Confirm embargoed release is excluded from daily digest (when implemented)

### Embargo management

- [ ] "Lift embargo" button → confirm dialog → confirm → confirm release immediately appears on public release page (within 60-second ISR window)
- [ ] "Edit embargo" button → change date to 2 hours from now → confirm updated lift time shown on dashboard badge
- [ ] Attempt to set `embargo_until` to a past datetime via the edit form → confirm 400 error
- [ ] Attempt to PATCH `/api/releases/[id]/embargo` as a journalist → confirm 401/403
- [ ] Attempt to PATCH another brand's release embargo → confirm 403
- [ ] Attempt to PATCH embargo on a draft release → confirm 400
- [ ] Lift embargo on a Growth plan → confirm lift is permitted (lifting is always allowed regardless of plan)

### ISR behaviour

- [ ] With embargo active: load public release page → confirm 404
- [ ] Repeat load immediately: confirm still 404 (not cached as 200)
- [ ] Lift embargo → wait up to 60 seconds → confirm release page renders correctly with full content
- [ ] Confirm Open Graph tags and JSON-LD present after embargo lifts and page renders

## Digest flow

## Stripe webhook

## AI integration (Google Gemini)

**Provider:** Google Generative AI (`@google/generative-ai`), not Anthropic.

**Env:** `GEMINI_API_KEY` (required for AI features). Optional: `GEMINI_MODEL_FLASH`, `GEMINI_MODEL_PRO` to override model IDs (defaults: `gemini-2.0-flash`, `gemini-2.0-pro`).

**Use cases**

1. **Press release AI Readiness Score** — `press_releases.ai_readiness_score` (0–100). Server jobs or brand upload flow call Gemini with `PRESS_RELEASE_AI_READINESS_SYSTEM` (see `lib/ai/prompts.ts`), ideally with `responseMimeType: application/json` for structured output. Pro tier can be used for long releases; Flash for fast iteration.
2. **Journalist Research Assistant** — Multimodal chat: text + inline images (menus, venue photos) and PDFs via `lib/ai/multimodal.ts` and `JOURNALIST_RESEARCH_ASSISTANT_SYSTEM`. API: `/api/journalist/chat` (to be implemented). Client: `components/journalist/ChatPanel.tsx`.

**Manual checks**

- [ ] `GEMINI_API_KEY` set in deployment environment (never commit real keys).
- [ ] Model IDs valid for your region. Defaults (`gemini-2.0-flash`, `gemini-2.0-pro`) are available in Hong Kong; elsewhere verify in [Google AI Studio](https://aistudio.google.com/).
- [ ] After wiring routes, exercise text-only and one image+text request for the research assistant.
## Embargoed Asset Delivery System (Phase 6 — Post-MVP)

### Pre-Launch Configuration

- [ ] Run RLS verification query — confirm zero rows returned:
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;
  ```

- [ ] Run REVOKE verification query — confirm zero rows returned:
  ```sql
  SELECT routine_name, grantee, privilege_type
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'public' AND grantee IN ('anon','authenticated');
  ```

- [ ] Verify Supabase Storage bucket `media-kits-private` exists and is private (no public access)

- [ ] Verify storage policies applied:
  - [ ] SELECT: Deny all (signed URLs only)
  - [ ] INSERT: Authenticated brand users only, path ownership enforced
  - [ ] UPDATE/DELETE: Brand owner only

### API Route Testing

#### POST /api/assets/request-token

**Valid Request (Invited, Embargo Lifted)**
- [ ] Create test invitation with past embargo_until
- [ ] As invited journalist, POST { assetId: '...' }
- [ ] Expected: 200, response contains { success: true, data: { token: '[UUID]' } }
- [ ] Verify token expires in 60 seconds (check created_at + 1 minute = expires_at)

**Invalid Request: Not Invited**
- [ ] POST request-token for asset without invitation
- [ ] Expected: 403, response contains { success: false, error: 'You do not have access to this asset' }
- [ ] Verify error is generic (doesn't reveal whether asset exists)

**Invalid Request: Embargo Still Active**
- [ ] Create invitation with embargo_until = now() + 1 hour
- [ ] POST request-token
- [ ] Expected: 403, response contains { success: false, error: 'This asset is still embargoed' }
- [ ] Verify response includes embargoUntil timestamp

**Invalid Request: Revoked Invitation**
- [ ] Create invitation, then set revoked_at = now()
- [ ] POST request-token
- [ ] Expected: 403, 'You do not have access to this asset'

**Invalid Request: Unauthenticated**
- [ ] POST request-token without auth header
- [ ] Expected: 401 'Unauthorized'

**Invalid Request: Malformed JSON**
- [ ] POST { assetId: 'not-a-uuid' }
- [ ] Expected: 400, { success: false, error: 'Invalid request body' }

#### GET /api/assets/download?token=[UUID]

**Valid Download: Token Consumed Successfully**
- [ ] Get valid token from request-token endpoint
- [ ] GET /api/assets/download?token=[valid]
- [ ] Expected: 200, file streamed with headers:
  - `Content-Type: application/octet-stream`
  - `Content-Disposition: attachment; filename="..."`
  - `Cache-Control: no-store, no-cache, must-revalidate`
- [ ] Verify asset_download_events row created with:
  - user_id, asset_id, brand_id, ip_address, user_agent, downloaded_at

**Invalid Download: Token Already Consumed**
- [ ] Use same token twice in quick succession
- [ ] First request: 200, file streams
- [ ] Second request: 403 'Access denied' (token marked consumed)

**Invalid Download: Token Expired**
- [ ] Create token with expires_at = now() - 1 minute (manually in DB)
- [ ] GET /api/assets/download?token=[expired]
- [ ] Expected: 403 'Access denied'

**Invalid Download: Malformed Token UUID**
- [ ] GET /api/assets/download?token=not-a-uuid
- [ ] Expected: 400 'Invalid or missing token'

**Invalid Download: No Token Parameter**
- [ ] GET /api/assets/download (no query params)
- [ ] Expected: 400 'Invalid or missing token'

**Invalid Download: Embargo Lifted Between Token Request and Download**
- [ ] Create invitation with embargo_until = now() + 1 hour
- [ ] Request token (succeeds: embargo check is only at token request time)
- [ ] Manually advance embargo_until to past
- [ ] GET /api/assets/download?token=[same_token]
- [ ] Expected: 403 'Access denied' (consume_download_token re-checks embargo)

### Frontend Component Testing

#### DownloadAssetButton (Embargo Active)

- [ ] Render with embargoUntil = now() + 2 hours
- [ ] Expected: Button shows "🔒 Available 2h 0m", disabled
- [ ] Wait/simulate 60+ seconds
- [ ] Expected: Countdown updates to "🔒 Available 1h 59m"
- [ ] Manually advance system time to embargo lift
- [ ] Expected: Button becomes "📥 Download", enabled

#### DownloadAssetButton (Embargo Lifted)

- [ ] Render with embargoUntil = null or past date
- [ ] Expected: Button shows "📥 Download", enabled
- [ ] Click button
- [ ] Expected: Loading state "⏳ Preparing download..."
- [ ] Expected: Browser download triggered (inspect Downloads folder)
- [ ] Expected: Button returns to "📥 Download" state

#### DownloadAssetButton (Error States)

**Token Generation Fails (401)**
- [ ] Mock POST /api/assets/request-token to return 401
- [ ] Click button
- [ ] Expected: Error message shown inline
- [ ] Expected: Button returns to normal state (not stuck in loading)

**Token Generation Fails (403 — Not Invited)**
- [ ] Click button for asset without invitation
- [ ] Expected: Error message "You do not have access to this asset"
- [ ] Expected: Error persists until button clicked again

**Download Fails (403 — Token Consumed)**
- [ ] Get token, click download
- [ ] Cancel before completion
- [ ] Immediately click again with same button (token already consumed from first try)
- [ ] Expected: Error "Access denied"

**Download Fails (Network Error)**
- [ ] Go offline
- [ ] Click download
- [ ] Expected: Error message "Download failed. Please try again."

### Security Testing

**Network Inspection: No Raw Storage Paths**
- [ ] Request token, get response
- [ ] Expected: Response contains only token UUID, no storage paths
- [ ] Download via token
- [ ] Inspect DevTools Network tab
- [ ] Expected: No request to `https://[project].supabase.co/storage/...`
- [ ] Expected: Only requests to `/api/assets/request-token` and `/api/assets/download`

**Token URL Sharing Prevention**
- [ ] Copy download URL from browser location bar after click
- [ ] Share URL with another journalist (out-of-band)
- [ ] Other journalist tries to use same URL in new browser
- [ ] Expected: 403 'Access denied' (token consumed by first user)

**Token Inspection (No Embedded Data)**
- [ ] Request token, inspect response
- [ ] Expected: Token is a plain UUID, not a JWT or encoded data
- [ ] (This ensures token value leakage doesn't expose user/asset data)

**RLS Policy Enforcement**
- [ ] Attempt to INSERT into download_tokens as authenticated user (via SQL editor)
- [ ] Expected: ERROR "new row violates row level security policy"
- [ ] Attempt to INSERT into asset_download_events as authenticated user
- [ ] Expected: Same RLS error

**Function REVOKE Enforcement**
- [ ] Attempt to call consume_download_token as anon or authenticated:
  ```sql
  SELECT * FROM consume_download_token('[token_uuid]'::uuid);
  ```
- [ ] Expected: ERROR "permission denied for function consume_download_token"

### Analytics & Telemetry

**Download Events Table Populated**
- [ ] Perform valid download
- [ ] Query asset_download_events table as brand owner
- [ ] Expected: New row exists with:
  - user_id = downloading journalist
  - asset_id = correct asset
  - brand_id = owning brand
  - ip_address = not null (x-forwarded-for or null)
  - user_agent = browser UA string
  - downloaded_at = current timestamp

**Brand Cannot See Other Brand's Download Events**
- [ ] Create second brand
- [ ] As brand_1_owner, query asset_download_events
- [ ] Expected: Only rows where brand_id = brand_1
- [ ] As brand_2_owner, query same table
- [ ] Expected: Only rows where brand_id = brand_2

**Journalist Cannot Access Download Events**
- [ ] As journalist, attempt SELECT from asset_download_events
- [ ] Expected: Zero rows returned (RLS blocks without policy for journalist)

### Invitation Flow (Manual UI Testing)

**Create Invitation**
- [ ] Brand owner uploads embargoed asset to media-kits-private bucket
- [ ] Creates invitation with invited_email = 'journalist@example.com', embargo_until = future
- [ ] Verify row created in asset_invitations table

**Email-Based Invitation (Pre-Signup)**
- [ ] Journalist not yet registered; receives invitation by email
- [ ] Invitation includes note that they need to sign up
- [ ] Journalist signs up with the same email
- [ ] After signup, can request token for asset (matched by email)
- [ ] Expected: consume_download_token matches by invited_email

**User-ID Invitation (Post-Signup)**
- [ ] Journalist already registered
- [ ] Brand creates invitation with invited_user_id = journalist's profiles.id
- [ ] Journalist can request and download immediately (no embargo needed)

**Revoke Invitation**
- [ ] Brand owner revokes (sets revoked_at = now())
- [ ] Journalist tries to request token
- [ ] Expected: 403 'You do not have access to this asset'

### Load & Performance Testing

**Concurrent Token Requests**
- [ ] 50 journalists simultaneously request tokens for same asset
- [ ] Expected: All get unique tokens (no race conditions)
- [ ] All tokens are valid and can be used once

**Concurrent Downloads**
- [ ] 50 journalists simultaneously download (different tokens)
- [ ] Expected: All complete successfully, no connection timeouts
- [ ] Each logs separate entry in asset_download_events

**Token Cleanup (Post-MVP)**
- [ ] Verify expired tokens (expires_at < now()) do not cause issues
- [ ] (At MVP, no cleanup job; tokens just sit idle)
- [ ] Post-MVP: verify scheduled cleanup deletes tokens > 24 hours old

### Integration with Press Release Lifecycle

**Embargo Coordination**
- [ ] Press release has embargo_until timestamp
- [ ] Asset invitations may have different embargo_until (asset-level)
- [ ] Test: release embargoed, asset not → asset is accessible
- [ ] Test: release published, asset embargoed → asset not accessible

**Soft-Deleted Assets**
- [ ] Brand soft-deletes asset (sets deleted_at = now())
- [ ] Journalist tries to download
- [ ] Expected: 403 'Access denied' (consume_download_token checks deleted_at)

**Soft-Deleted Brands**
- [ ] Brand owner deletes brand (sets deleted_at = now())
- [ ] Invitations reference brand via asset_invitations.brand_id
- [ ] Invitation is cascade-deleted (asset_invitations.brand_id REFERENCES brands ON DELETE CASCADE)
- [ ] Journalist tries to download
- [ ] Expected: 403 (invitation no longer exists)

### SQL Smoke Tests

- [ ] Run embargoed_assets_rls_smoke.sql and verify all assertions pass
- [ ] Verify no constraint violations or RLS policy errors

### Documentation & Handoff

- [ ] Update API documentation with /api/assets/request-token and /api/assets/download
- [ ] Document token TTL (60 seconds), single-use semantics
- [ ] Document embargo enforcement (checked both at token request and consumption)
- [ ] Add troubleshooting guide (common errors: 403, 404, token expiry)
- [ ] Add example curl commands for testing endpoints

## Journalist portfolio

### Signup integration
- [ ] Sign up as a journalist → confirm journalist_portfolio_settings row created automatically
- [ ] Confirm slug generated correctly from full_name (lowercase, hyphens, no special characters)
- [ ] Sign up two journalists with the same name → confirm second slug has -2 suffix

### Public portfolio page
- [ ] Visit /journalist/[slug] as unauthenticated user → confirm page renders
- [ ] Set public = false in portfolio settings → confirm /journalist/[slug] returns 404
- [ ] Add an article → confirm it appears on public page within 60 seconds (ISR revalidation)
- [ ] Confirm schema.org JSON-LD is present in page source

### Logging a publication
- [ ] Click "I published this" on a release card → confirm modal opens with headline pre-filled
- [ ] Submit with valid URL → confirm article appears in portfolio immediately
- [ ] Submit same URL a second time → confirm 409 error "This article has already been added to your portfolio."
- [ ] Submit with a URL that returns 404 → confirm 422 error "The article URL could not be reached."
- [ ] Submit as a brand user → confirm button is not rendered
- [ ] Submit as unauthenticated user → confirm button is not rendered on release page

### Manual entry (no release)
- [ ] Go to /(journalist)/portfolio → click "Add article" → submit without a press_release_id → confirm article appears with no "Source release" link

### Edit and remove
- [ ] Edit an article's headline → confirm change appears on public portfolio page
- [ ] Remove an article → confirm it disappears from public portfolio page
- [ ] Confirm removed article shows "Removed" label in /(journalist)/portfolio with Restore option
- [ ] Restore a removed article → confirm it reappears publicly

### Portfolio settings
- [ ] Change slug → confirm old URL returns 404, new URL resolves correctly
- [ ] Attempt to set slug to one already taken by another journalist → confirm 409 error
- [ ] Set slug with uppercase characters or spaces → confirm validation error before submit

### Brand coverage page
- [ ] Log a publication as journalist against a brand's release → confirm it appears in /(brand)/coverage
- [ ] Set journalist portfolio to private → confirm article disappears from brand's coverage page
- [ ] Confirm journalist email and linkedin_url are never visible in brand coverage page (inspect network responses)

## Brand profile governance (agency audit)

### Agency name-change audit
- [ ] As an agency-plan brand owner, change `brands.name` once in a quarter → save succeeds, no audit banner
- [ ] Change `brands.name` a second time in the same calendar quarter → save succeeds, settings shows "Account flagged for manual review"
- [ ] Confirm `brands.needs_manual_audit = true` and `audit_reason = agency_name_change_limit` in Supabase
- [ ] Confirm Stripe Customer metadata includes `needs_manual_audit: true` (Dashboard → Customers → Metadata)
- [ ] Non-agency plans can rename freely without audit flag

## Resend hard-bounce automation

### Webhook handler
- [ ] POST a signed `email.bounced` payload with `bounce.type: Permanent` to `/api/webhooks/resend` → 200 `{ received: true }`
- [ ] Duplicate `svix-id` → 200 `{ duplicate: true }` (idempotent)
- [ ] Invalid/missing Svix signature → 400
- [ ] Soft bounce (`bounce.type: Transient`) → 200 `{ ignored: true }`, journalist unchanged

### Journalist deactivation
- [ ] After hard bounce on journalist email: `journalist_profiles.is_inactive = true`, `inactive_reason = hard_bounce`
- [ ] `scheduled_deletion_at` is approximately 90 days after `inactive_at`
- [ ] `journalist_portfolio_settings.public = false` and `/journalist/[slug]` returns 404
- [ ] Journalist login shows inactive notice with deletion date (portal blocked)
- [ ] `PATCH /api/journalist/portfolio/settings` returns 403 for inactive journalist

### 90-day deletion cron
- [ ] Set `scheduled_deletion_at` in the past for a test inactive journalist
- [ ] `GET /api/cron/journalist-deletion` with `Authorization: Bearer $CRON_SECRET` → deletes auth user
- [ ] Confirm cascade removes `profiles`, portfolio settings, and publications
