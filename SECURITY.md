# Security notes (Broadbase)

## Never commit secrets

This repo relies on local environment variables for secrets (Supabase service role, Stripe secrets, email providers, AI keys).

- Keep `.env.local` **local only** (it is ignored by `.gitignore` via `.env*.local`).
- Use `.env.local.example` as the template for required variables.
- If a secret ever leaks, rotate it immediately in the vendor dashboard (Supabase/Stripe/etc.).

## Content Security Policy (CSP)

We set a **nonce-based CSP** in `middleware.ts` to avoid `script-src 'unsafe-inline'`.
If you add third-party scripts, prefer `next/script` with a `nonce` (read from the `x-nonce` header) and update CSP allowlists deliberately.

## Edge firewall (Vercel WAF)

Platform-level abuse protection runs at the Vercel edge **before** application code:

- **Declarative rules:** `scripts/firewall/manifest.json` (Pro) or `manifest.hobby.json` (Hobby)
- **Apply:** `npm run firewall:apply` — see `DEPLOY.md` §2.5
- **In-app limits:** expensive AI routes also use per-user hourly caps in Postgres (`lib/ai/rate-limit.ts`, `chat_rate_limits`)

Webhook and cron paths are explicitly bypassed so Stripe, Resend, and scheduled jobs are not blocked by API rate limits. During sustained attacks, enable **Attack Mode** via the Vercel CLI or dashboard (`vercel firewall attack-mode enable`).

