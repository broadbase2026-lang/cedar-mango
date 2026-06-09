# Deploy runbook — staged beta (broadbase.app)

Operational steps to deploy Broadbase for an invite-only, trial-only beta on Vercel at `https://broadbase.app`.

## Prerequisites

- GitHub repo access
- Vercel account linked to GitHub
- DNS control for `broadbase.app` and `www.broadbase.app`
- New **production** Supabase project (do not reuse local dev DB)
- Google AI Studio API key with billing enabled
- Beta invite code to share with testers

## 1. Supabase production setup

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard) (region close to users).
2. Apply migrations from `supabase/migrations/` in filename order:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   Or paste each migration SQL in the SQL Editor on a fresh database.

   **Migration 013** requires `010_journalist_portfolio.sql` (and `011_journalist_portfolio_signup.sql` for signup). If `013` was run before `010`, apply `010`/`011` first, then re-run `013` to apply the portfolio RLS hardening (core inactive columns are idempotent).
3. Verify storage buckets exist:
   - `press-assets-public` (public)
   - `press-assets-private` (private)
   - `media-kits-private` (private)
4. Configure **Authentication → URL Configuration**:
   - **Site URL:** `https://broadbase.app`
   - **Redirect URLs:** `https://broadbase.app/**`, `https://www.broadbase.app/**`, `http://localhost:3000/auth/callback` (local dev)
5. Configure **Authentication → Providers → Email**:
   - Enable **Confirm email** (required — without this, signup skips verification and no confirmation email is sent)
   - Optional: enable **Secure email change** for production
6. Configure email delivery:
   - **Recommended:** set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in Vercel — the app sends signup confirmation links via Resend (no Supabase SMTP required).
   - **Optional fallback:** **Project Settings → Authentication → SMTP Settings** → custom SMTP (e.g. Resend SMTP) if you prefer Supabase to send auth mail directly.
   - Supabase’s built-in mail is rate-limited and often blocked in production.
   - **Troubleshooting “Error sending confirmation email”:** ensure `RESEND_API_KEY` + `RESEND_FROM_EMAIL` are set on Vercel and the sender domain is verified in Resend; redeploy after adding env vars.
7. Copy credentials for Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only)

Optional: run `supabase/tests/rls_smoke.sql` and `supabase/tests/embargoed_assets_rls_smoke.sql` against the prod project.

## 2. Vercel project setup

1. Import the GitHub repo → Framework: Next.js.
2. Build settings:
   - Build command: `npm run build`
   - Node.js: 20.x
3. Set **Production** environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `NEXT_PUBLIC_APP_URL` | `https://broadbase.app` |
| `RESEND_API_KEY` | Resend API key (signup confirmation emails) |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `Broadbase <onboarding@broadbase.app>` |
| `GEMINI_API_KEY` | Google AI key |
| `BETA_TRIAL_ONLY` | `true` |
| `BETA_INVITE_CODE` | Your private invite code |

Stripe variables are **not required** for trial-only beta.

4. Add domains `broadbase.app` and `www.broadbase.app`; configure DNS per Vercel instructions.

## 3. Deploy

```bash
npm run lint
npm run test
npm run build
git push origin main
```

Monitor the Vercel build for Next.js success and `scripts/copy-main-css.mjs` completion.

## 4. Post-deploy smoke tests (~30 min)

Run on `https://broadbase.app` (see `QA.md` for full checklist):

**Public / auth**
- [x] Homepage loads; nav links work (CSP does not break hydration)
- [x] `/pricing` shows trial CTA; paid checkout buttons show “Beta — trial only”
- [x] `/signup` requires invite code; wrong code rejected
- [x] Valid invite signup → email confirmation flow works
- [x] Login → brand user reaches dashboard or trial upload

**Brand trial**
- [x] Trial subscription row created (`plan=starter`, `status=trialing`, `trial_mode=true`)
  - Verify in Supabase **SQL Editor** (see `QA.md`); if `trial_mode` column is missing, apply `supabase/migrations/007_trial_mode.sql` (or run `supabase db push` against the linked project).
- [x] First publish succeeds; second publish blocked

**Journalist**
- [x] Signup + login → `/journalist/discover` with real published releases (or mock fallback if none)
- [x] Chat widget responds (requires `GEMINI_API_KEY`)

**Storage**
- [ ] Avatar upload works
- [ ] Public press asset upload works

**Security**
- [ ] Dev mock user does not get Enterprise access in production
- [x] Unauthenticated `/brand/dashboard` redirects to login

## 5. Beta operations

**Onboarding testers:** share `https://broadbase.app/signup?trial=true` and the invite code privately.

**Rotate access:** change `BETA_INVITE_CODE` in Vercel and redeploy between cohorts.

**Monitoring:** Vercel function logs (5xx on `/api/*`); Supabase logs for RLS violations.

**Rollback:** Vercel instant rollback to previous deployment.

## 6. Webhooks & cron (GA)

### Stripe

1. Set `STRIPE_*` env vars (see `.env.local.example`).
2. Register webhook at `https://broadbase.app/api/webhooks/stripe` for:
   - `checkout.session.completed`
   - `customer.subscription.created` / `updated` / `deleted`
   - `invoice.paid`
3. Checkout sets `client_reference_id` and `subscription_data.metadata.supabase_user_id` for owner linking.
4. Brand workspace saves sync audit metadata to Stripe Customer fields: `brand_name`, `needs_manual_audit`, `audit_reason`.
5. Review flagged agency accounts in Supabase: `SELECT * FROM brands WHERE needs_manual_audit = true;`

### Resend (hard bounces)

1. Set `RESEND_WEBHOOK_SECRET` (Svix signing secret from Resend dashboard).
2. Register webhook at `https://broadbase.app/api/webhooks/resend` for `email.bounced`.
3. Permanent/hard bounces set `journalist_profiles.is_inactive = true`, unpublish portfolio (`public = false`), and `scheduled_deletion_at = now() + 90 days`.

### Journalist deletion cron

1. Set `CRON_SECRET` in Vercel (used as `Authorization: Bearer <CRON_SECRET>`).
2. Vercel cron runs daily at 03:00 UTC: `/api/cron/journalist-deletion`.
3. Deletes auth users whose `scheduled_deletion_at` has passed (cascades portfolio data).

## 7. Exit criteria (beta → GA)

1. Stripe checkout ↔ webhook owner linking verified (`client_reference_id` + subscription metadata).
2. Set `STRIPE_*` env vars; register Stripe webhook (see §6).
3. Set `RESEND_WEBHOOK_SECRET`; register Resend webhook (see §6).
4. Set `CRON_SECRET`; confirm journalist deletion cron is scheduled.
5. Set `BETA_TRIAL_ONLY=false`; remove or rotate `BETA_INVITE_CODE`.
6. Re-enable billing portal in brand settings.
