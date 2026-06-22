# Agent instructions (Broadbase)

Rules for AI coding agents (Cursor, etc.) working in this repository.

## Before you act

1. **Make a plan** for non-trivial work and confirm scope with the user when requirements are ambiguous.
2. **Read surrounding code** and match existing conventions before editing.
3. **Minimize diff scope** — do not refactor or “improve” unrelated code.

## Production and credentials

- **Never put production secrets in `.env.local`.** Local env should point at a **dev** Supabase project only. Production keys live in Vercel (and the Supabase dashboard), not on a laptop agent can shell into.
- **Do not run mutating commands against production** without explicit user approval in the current session:
  - `supabase db push`, `supabase db reset`, or raw SQL against a linked prod project
  - `npm run import-mbox`, `npm run rollback-mbox`, `npm run purge-mbox-brands` (unless user explicitly requests prod and sets override — see below)
  - Any one-off script using `SUPABASE_SERVICE_ROLE_KEY`
- **Service role = full database access.** RLS does not apply. Treat `SUPABASE_SERVICE_ROLE_KEY` like root credentials.
- CLI scripts enforce `BROADBASE_PROD_SUPABASE_PROJECT_REF` (see `.env.local.example`). Do not set `BROADBASE_SCRIPT_OVERRIDE_PROD` unless the user explicitly asks to mutate production.

## Git and safety

- **Commit after notable changes** when the user asks for a commit, or when a logical unit of work is complete and they expect it saved.
- **Do not force-push** to `main` or rewrite published history unless explicitly requested.
- **Do not commit** `.env.local`, service role keys, or other secrets.

## Deploy and infra

- App deploys via **git push → Vercel**. Database changes via **migrations in `supabase/migrations/`** — review SQL before applying to prod.
- **App rollback:** Vercel instant rollback (see `DEPLOY.md`). That does **not** restore database or storage.
- **Disaster recovery:** see `DEPLOY.md` §8.

## What is in scope for agents

- Application code, tests, migrations (with review), and docs in this repo.
- **Out of scope:** unsupervised changes to Vercel env, Supabase dashboard settings, DNS, or Stripe/Resend dashboards — describe steps for the human operator instead.
