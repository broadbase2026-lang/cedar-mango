# Deferred (post-MVP)

- Journalist AI assistant: persistent conversation history (chat_sessions table, 30-day retention)
- Journalist AI assistant: vector embedding retrieval (pgvector, press_release_embeddings table)
- Signed URL download: one-time-use token binding to prevent URL sharing
- Rate limiting: scheduled cleanup of chat_rate_limits rows older than 24 hours
- Analytics: scheduled cleanup of release_views and asset_downloads older than 12 months
- Digest: scheduled cleanup of digest_sends older than 90 days
- Organisations table: sub-brand hierarchy for agency accounts with per-brand team member access
- Featured Placement: purchase flow for the featured column
- CSP: tighten script-src by replacing unsafe-inline with nonce-based approach (requires disabling ISR on affected pages)
- Trial enforcement: consider adding a trials table to track trial start date independently of profiles.created_at, in case profiles rows are ever backfilled or migrated.
- Per-brand storage metering dashboard for brand users (show used vs allocated storage with a progress bar in /(brand)/settings)
- Storage overage billing for Enterprise accounts exceeding 100GB (requires Stripe metered billing integration)
- Embargo lift notification: send a Resend email to the brand owner when embargo_until passes, confirming the release is now publicly visible. Requires a scheduled job or webhook-triggered check.
