# Deploy runbook — staged beta (broadbase.app)

Operational steps to deploy Broadbase for an invite-only, trial-only beta on Vercel at `https://broadbase.app`.

## Prerequisites

- GitHub repo access
- Vercel account linked to GitHub
- DNS control for `broadbase.app` and `www.broadbase.app`
- New **production** Supabase project (do not reuse local dev DB)
- Google AI Studio API key with billing enabled
- Beta site password to share with testers

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
| `RESEND_API_KEY` | Resend API key — must allow **Contacts** (not send-only); used for signup emails and beta waitlist |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `Broadbase <onboarding@broadbase.app>` |
| `GEMINI_API_KEY` | Google AI key |
| `BETA_TRIAL_ONLY` | `true` |
| `BETA_INVITE_CODE` | Your private beta site password |

Stripe variables are **not required** for trial-only beta.

4. Add domains `broadbase.app` and `www.broadbase.app`; configure DNS per Vercel instructions.

### 2.5 Vercel Firewall (API abuse protection)

Edge WAF rules throttle abusive traffic **before** it reaches Next.js or Supabase. Rules are version-controlled in `scripts/firewall/manifest.json` and applied with the Vercel CLI.

**Plan requirements**

| Plan | Custom rules | Rate-limit rules |
|------|--------------|------------------|
| Hobby | 3 total | 1 per project |
| Pro | 40 | Multiple |

On **Hobby**, use the reduced set in `scripts/firewall/manifest.hobby.json` (bypass + deny probes + one `/api` rate limit). On **Pro**, apply the full manifest.

**One-time setup**

```bash
npm i -g vercel
vercel login
vercel link          # from repo root — select the broadbase.app project
npm run firewall:apply -- --dry-run   # preview CLI flags
npm run firewall:apply -- --yes       # stage + publish rules (Pro manifest)
# Hobby plan (3 rules max):
npm run firewall:apply:hobby -- --yes
```

**What the rules do** (full manifest)

1. **Bypass** `/api/webhooks/*` and `/api/cron/*` — Stripe, Resend, and Vercel cron must not be throttled.
2. **Deny** common scanner paths (`.env`, `.git`, WordPress, phpMyAdmin).
3. **Rate limit** `/api/v1/*` — 60 requests/minute per IP (public feed).
4. **Rate limit** `/api/*` — 120 requests/minute per IP (general API blanket).
5. **Rate limit** `POST` to `/signup`, `/login`, `/beta-access` — 20/minute per IP.
6. **Rate limit** server actions `signupAction`, `loginAction`, `betaWaitlistAction`, `betaAccessAction` — 20/minute per IP.

**During an attack**

```bash
# Challenge all browser traffic for 1–24h (webhook bots are allowlisted)
vercel firewall attack-mode enable --duration 6h --yes

# When resolved
vercel firewall attack-mode disable --yes
```

**Ongoing**

- `npm run firewall:overview` — current firewall state
- Edit `scripts/firewall/manifest.json`, then `npm run firewall:apply -- --yes`
- Vercel dashboard → **Firewall** → traffic view to tune limits

Automatic DDoS mitigation is enabled by default. Do **not** pause system mitigations unless debugging false positives.

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
- [x] Unauthenticated visitors are redirected to `/beta-access` until they enter the beta password
- [x] `/signup` no longer asks for an invite code; signup works after site unlock
- [x] Login → brand user reaches dashboard or trial upload

**Brand trial**
- [x] Trial subscription row created (`plan=starter`, `status=trialing`, `trial_mode=true`)
  - Verify in Supabase **SQL Editor** (see `QA.md`); if `trial_mode` column is missing, apply `supabase/migrations/007_trial_mode.sql` (or run `supabase db push` against the linked project).
- [x] First publish succeeds; second publish blocked

**Journalist**
- [x] Signup + login → `/journalist/discover` with real published releases (or mock fallback if none)
- [x] Chat widget responds (requires `GEMINI_API_KEY`)

**Storage**
- [X] Avatar upload works
- [x] Public press asset upload works

**Security**
- [x] Dev mock user does not get Enterprise access in production
- [x] Unauthenticated `/brand/dashboard` redirects to login

## 5. Beta operations

**Onboarding testers:** share `https://broadbase.app` and the beta password privately.

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

## 8. Disaster recovery

Broadbase splits **code**, **database**, and **files**. Plan for each independently.

### What Vercel rollback covers

- **Covers:** previous Next.js deployment (app code, serverless config).
- **Does not cover:** Supabase data, storage objects, Stripe subscriptions, or DNS.

Use **Vercel → Deployments → … → Promote to Production** (or instant rollback) for bad deploys only.

### Database (Supabase)

1. **Prevention:** use a separate Supabase project for local/dev (`DEPLOY.md` §1). Never point `.env.local` at production for routine work. Set `BROADBASE_PROD_SUPABASE_PROJECT_REF` locally so mutating CLI scripts block prod (see `AGENTS.md`).
2. **Backups:** confirm your prod plan includes [daily backups and/or PITR](https://supabase.com/docs/guides/platform/backups) in the Supabase dashboard. Note the retention window.
3. **Restore:** Supabase dashboard → **Database → Backups** (or **Point in Time Recovery** on eligible plans). Restores replace DB state to a prior time — coordinate with app deploy version if schema changed.
4. **Migrations:** schema is versioned in `supabase/migrations/`. After a DB restore to an empty project, re-apply migrations in order (`supabase db push` or SQL Editor).

### Storage (Supabase buckets)

- `press-assets-public`, `press-assets-private`, `media-kits-private` are **not** restored when you roll back a Vercel deploy.
- Bucket recovery depends on Supabase backup scope for your plan; treat uploaded assets as critical data.
- For extra safety: periodic export of bucket manifests or off-platform copy for irreplaceable media (manual or scheduled job outside this repo).

### Secrets and third parties

| Asset | If compromised or lost |
|-------|-------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Rotate in Supabase → Settings → API; update Vercel env; redeploy |
| `STRIPE_*` | Rotate in Stripe dashboard; update webhook signing secret |
| `GEMINI_API_KEY` | Rotate in Google AI Studio |
| `CRON_SECRET` | Regenerate; update Vercel env |

### Code

- Source of truth: **GitHub** (`main`). Clone or revert commits if working tree is corrupted.
- Agent rules: `AGENTS.md`.

### RTO checklist (data incident)

1. Stop the bleeding — revoke/rotate leaked keys; disable cron if abuse suspected.
2. Assess scope — Supabase logs, `asset_download_events`, Stripe dashboard.
3. Restore DB from Supabase backup/PITR to last known-good time.
4. Roll back or redeploy app if needed.
5. Verify smoke tests in `QA.md` §4 against production.
6. Post-incident: document cause; tighten env separation and backups if gaps found.
