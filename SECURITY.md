# Security notes (Broadbase)

## Never commit secrets

This repo relies on local environment variables for secrets (Supabase service role, Stripe secrets, email providers, AI keys).

- Keep `.env.local` **local only** (it is ignored by `.gitignore` via `.env*.local`).
- Use `.env.local.example` as the template for required variables.
- If a secret ever leaks, rotate it immediately in the vendor dashboard (Supabase/Stripe/etc.).

## Content Security Policy (CSP)

We set a **nonce-based CSP** in `middleware.ts` to avoid `script-src 'unsafe-inline'`.
If you add third-party scripts, prefer `next/script` with a `nonce` (read from the `x-nonce` header) and update CSP allowlists deliberately.

