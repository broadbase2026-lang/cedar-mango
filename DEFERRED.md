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
