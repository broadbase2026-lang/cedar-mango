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
3. Verify storage buckets exist:
   - `press-assets-public` (public)
   - `press-assets-private` (private)
   - `media-kits-private` (private)
4. Configure **Authentication → URL Configuration**:
   - **Site URL:** `https://broadbase.app`
   - **Redirect URLs:** `https://broadbase.app/**`, `https://www.broadbase.app/**`
5. Configure **Authentication → Providers → Email** (confirmations as desired).
6. Copy credentials for Vercel:
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
- [ ] Homepage loads; nav links work (CSP does not break hydration)
- [ ] `/pricing` shows trial CTA; paid checkout buttons show “Beta — trial only”
- [ ] `/signup` requires invite code; wrong code rejected
- [ ] Valid invite signup → email confirmation flow works
- [ ] Login → brand user reaches dashboard or trial upload

**Brand trial**
- [ ] Trial subscription row created (`plan=starter`, `status=trialing`, `trial_mode=true`)
- [ ] First publish succeeds; second publish blocked

**Journalist**
- [ ] Signup + login → `/journalist/discover` with real published releases (or mock fallback if none)
- [ ] Chat widget responds (requires `GEMINI_API_KEY`)

**Storage**
- [ ] Avatar upload works
- [ ] Public press asset upload works

**Security**
- [ ] Dev mock user does not get Enterprise access in production
- [ ] Unauthenticated `/brand/dashboard` redirects to login

## 5. Beta operations

**Onboarding testers:** share `https://broadbase.app/signup?trial=true` and the invite code privately.

**Rotate access:** change `BETA_INVITE_CODE` in Vercel and redeploy between cohorts.

**Monitoring:** Vercel function logs (5xx on `/api/*`); Supabase logs for RLS violations.

**Rollback:** Vercel instant rollback to previous deployment.

## 6. Exit criteria (beta → GA)

1. Fix Stripe checkout ↔ webhook owner linking (`client_reference_id` + subscription metadata).
2. Set `STRIPE_*` env vars; register webhook at `https://broadbase.app/api/webhooks/stripe`.
3. Set `BETA_TRIAL_ONLY=false`; remove or rotate `BETA_INVITE_CODE`.
4. Re-enable billing portal in brand settings.
