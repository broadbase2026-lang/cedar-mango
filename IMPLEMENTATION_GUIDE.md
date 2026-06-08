## Embargoed Asset Delivery System — Implementation Guide

### Overview

This document describes how to integrate the embargoed asset delivery system into Broadbase. This is a **post-MVP feature** (Phase 6) that runs *alongside* the existing press asset discovery flow, not as a replacement.

**What it does:**
- Brands invite specific journalists to access embargoed (time-locked) assets
- Assets live in a separate, private `media-kits-private` storage bucket
- Journalists authenticate and request a short-lived (60-second), single-use token
- Token is consumed atomically; cannot be reused or shared
- Download proxy streams files to journalists and logs telemetry

**Key security properties:**
- No raw Supabase storage URLs exposed to the client
- Embargo status checked both at token request and download time
- One-time token binding prevents URL sharing
- Full RLS enforcement; service role required for token/telemetry operations
- Fire-and-forget telemetry logging (non-blocking downloads)

---

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Journalist Browser                                          │
└─────────────────────────────────────────────────────────────┘
                        │
                        ↓ (1) Click "Download"
        ┌───────────────────────────────────┐
        │ DownloadAssetButton.tsx            │
        │ - Shows embargo countdown          │
        │ - Disables if embargo active       │
        └───────────────────────────────────┘
                        │
                        ↓ (2) POST /api/assets/request-token
        ┌───────────────────────────────────┐
        │ /api/assets/request-token         │
        │ - Verify invitation exists         │
        │ - Check embargo_until <= now()     │
        │ - INSERT download_tokens row       │
        │ - Return token UUID               │
        └───────────────────────────────────┘
                        │
                        ↓ (3) GET /api/assets/download?token=...
        ┌───────────────────────────────────┐
        │ /api/assets/download               │
        │ - RPC: consume_download_token()    │
        │   └─ Verify token, embargo, perm   │
        │   └─ Mark token consumed (atomic)  │
        │ - Download from media-kits-private │
        │ - Stream response (no-store cache) │
        │ - (Fire-and-forget telemetry)      │
        └───────────────────────────────────┘
                        │
                        ↓ (4) Browser download
        File saved to journalist's Downloads folder
```

---

### Database Schema

#### New Tables

**`asset_invitations`**
```sql
id              uuid PRIMARY KEY
brand_id        uuid FK → brands
asset_id        uuid FK → press_assets
invited_email   text (OR)
invited_user_id uuid FK → profiles (OR)
embargo_until   timestamptz
created_by      uuid FK → profiles
created_at      timestamptz
updated_at      timestamptz
revoked_at      timestamptz (soft-delete)
```

Unique constraints:
- One invitation per (asset, invited_email) when email is used
- One invitation per (asset, invited_user_id) when user_id is used

**`download_tokens`**
```sql
id          uuid PRIMARY KEY
user_id     uuid FK → profiles (NOT NULL)
asset_id    uuid FK → press_assets (NOT NULL)
created_at  timestamptz
expires_at  timestamptz (default now() + 60 seconds)
consumed_at timestamptz (NULL until token is used)
```

Indexes:
- `(user_id)` for access control
- `(expires_at)` WHERE consumed_at IS NULL for validity checks
- `(asset_id)` for cross-reference

**`asset_download_events`**
```sql
id            uuid PRIMARY KEY
user_id       uuid FK → profiles (nullable for anonymous downloads)
asset_id      uuid FK → press_assets (NOT NULL)
brand_id      uuid FK → brands (NOT NULL)
ip_address    inet
user_agent    text
downloaded_at timestamptz
```

Indexes:
- `(asset_id)`, `(brand_id)`, `(downloaded_at DESC)` for analytics queries

#### RLS Policies

All tables have row-level security enabled. Key policies:

- **asset_invitations**: Brand owner can CRUD invitations for their assets; journalists can read own invitations
- **download_tokens**: Journalists can read own tokens only; service role can insert/update
- **asset_download_events**: Brand owner can read telemetry; service role can insert

#### Postgres Functions

**`consume_download_token(token_id uuid)`**

Returns: `(asset_id, asset_path, file_name, user_id, is_authorized)`

Atomic checks:
1. Token exists, not expired, not consumed
2. Asset exists and not soft-deleted
3. Invitation exists and not revoked
4. Invitation email/user_id matches requesting user
5. Embargo has lifted (embargo_until IS NULL OR embargo_until <= now())
6. Mark token consumed if all checks pass

Returns `is_authorized = false` if any check fails.

EXECUTE revoked from anon and authenticated; service role only.

---

### API Routes

#### POST `/api/assets/request-token`

**Request:**
```json
{
  "assetId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8"
  }
}
```

**Response (403 Forbidden — Not Invited or Embargo Active):**
```json
{
  "success": false,
  "error": "You do not have access to this asset",
  "embargoUntil": "2025-06-15T14:00:00Z"  // optional, only if embargo active
}
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid request body"
}
```

#### GET `/api/assets/download?token=[UUID]`

**Query Parameters:**
- `token` (required): Single-use token from /api/assets/request-token

**Response (200 OK):**
```
[File binary stream]

Headers:
- Content-Type: application/octet-stream
- Content-Disposition: attachment; filename="asset.pdf"
- Cache-Control: no-store, no-cache, must-revalidate
- X-Content-Type-Options: nosniff
```

**Response (403 Forbidden — Token Invalid, Expired, or Consumed):**
```
Access denied
```

**Response (404 Not Found — File not in storage):**
```
File not found
```

**Response (400 Bad Request — Malformed Token):**
```
Invalid or missing token
```

---

### Supabase Storage Bucket

#### Bucket Name: `media-kits-private`

**File Path Convention:**
```
media-kits-private/{brand_id}/{release_id}/{asset_id}_{filename}
```

Example:
```
media-kits-private/f0e1d2c3-b4a5-6789-c0d1-e2f3a4b5c6d7/
                   a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8/
                   e4b5c6d7-f8a9-0123-b4c5-d6e7f8a9b0c1_press-kit.pdf
```

#### Storage Policies

**SELECT Policy:**
```
Deny all (no direct public access)
Reasoning: Files are accessed exclusively via signed URLs generated
by /api/assets/download. No client-side SELECT is permitted.
```

**INSERT Policy:**
```sql
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.brands
    WHERE brands.owner_id = (select auth.uid())
      AND brands.deleted_at IS NULL
      -- Extract brand_id from path: first folder level
      AND (storage.foldername(name))[1] = brands.id::text
  )
);
```

**UPDATE/DELETE Policies:**
```
Brand owner only (matching path ownership)
```

---

### Frontend Integration

#### Component: `DownloadAssetButton`

**Props:**
```typescript
interface DownloadAssetButtonProps {
  assetId: string;           // UUID of press_asset
  fileName: string;          // Display name for download
  embargoUntil?: string | null;  // ISO 8601 timestamp or null
}
```

**States:**
1. **Embargo Active:** Button disabled, shows "🔒 Available Xh Ym"
2. **Embargo Lifted:** Button enabled, shows "📥 Download"
3. **Loading:** Shows "⏳ Preparing download..."
4. **Error:** Shows inline error message below button

**Usage Example:**
```tsx
import { DownloadAssetButton } from '@/components/DownloadAssetButton';

export default function AssetCard({ asset }) {
  return (
    <div>
      <h3>{asset.file_name}</h3>
      <DownloadAssetButton
        assetId={asset.id}
        fileName={asset.file_name}
        embargoUntil={asset.invitation.embargo_until}
      />
    </div>
  );
}
```

---

### Invitation Flow (Brand UI)

Brands manage invitations via a (TBD) UI. Example structure:

1. **Upload embargoed asset** → Media Kit kit (collection of assets)
2. **Invite journalists** → "Add invitees" button
3. **Set embargo dates** → Date picker (per-invitation)
4. **View download analytics** → Dashboard showing who downloaded what

---

### Integration with Existing Broadbase Features

#### vs. Existing `/api/download` (Public/Published Assets)

| Aspect | `/api/download` (Existing) | `/api/assets/download` (New) |
|--------|---------------------------|----------------------------|
| **Assets** | Published press_releases | Embargoed assets (any status) |
| **Bucket** | press-assets-private | media-kits-private |
| **Visibility** | Auto-discoverable by journalists | Invite-only |
| **URL Format** | Signed URL (300s expiry) | Token-based (60s, single-use) |
| **Embargo** | Checked at publish time | Checked at token request & download |
| **Use Case** | Pull-based discovery | Push-based exclusive sharing |

Both coexist. Asset type determines which flow applies.

#### vs. `journalist_follows`, `journalist_folders`

- **Follows:** Subscribe to brand's public releases
- **Folders:** Organize saved public releases
- **Invitations:** One-off, time-locked exclusive access

These are orthogonal. Journalists can:
- Follow a brand AND receive separate invitation to embargoed assets
- Save public releases in folders AND download embargoed assets

---

### Implementation Checklist

#### Phase 1: Database & Infrastructure
- [ ] Apply migration `009_embargoed_assets.sql`
- [ ] Create Supabase Storage bucket `media-kits-private`
- [ ] Apply storage policies (SELECT deny, INSERT/UPDATE/DELETE with ownership checks)
- [ ] Verify RLS policies via SQL smoke tests
- [ ] Verify function REVOKE statements

#### Phase 2: API Routes
- [ ] Create `/api/assets/request-token` route with Zod validation
- [ ] Create `/api/assets/download` route with token consumption and telemetry
- [ ] Add error handling and logging
- [ ] Test both routes end-to-end with valid/invalid tokens
- [ ] Verify no storage paths leak in responses

#### Phase 3: Frontend
- [ ] Create `DownloadAssetButton.tsx` component
- [ ] Add embargo countdown logic
- [ ] Add loading and error states
- [ ] Integrate into asset card / modal (TBD page)
- [ ] Test countdown accuracy

#### Phase 4: Brand UI (TBD)
- [ ] Create invitation management page
- [ ] List invitations per asset
- [ ] Add/revoke invitations
- [ ] View download analytics
- [ ] Send invitation emails (via Resend)

#### Phase 5: Testing & QA
- [ ] Run all SQL smoke tests
- [ ] Manual QA against checklist (`QA_embargoed_assets.md`)
- [ ] Load testing (50+ concurrent downloads)
- [ ] Security testing (token reuse, URL sharing, RLS bypass)
- [ ] Integration testing with soft-deletes, brand deletion

#### Phase 6: Documentation & Deployment
- [ ] Update API docs
- [ ] Add troubleshooting guide
- [ ] Brief team on security properties
- [ ] Deploy to staging, run full QA
- [ ] Deploy to production with monitoring on asset_download_events insertion failures

---

### Security Assumptions & Guarantees

**Guarantees:**
1. ✅ No raw storage URLs leaked to client
2. ✅ One-time token binding (single consumption)
3. ✅ Embargo enforced at token request + download time
4. ✅ RLS prevents journalist-to-journalist token visibility
5. ✅ Service role required for token/telemetry writes
6. ✅ Soft-delete respected (deleted assets cannot be downloaded)
7. ✅ Revoked invitations immediately prevent new tokens

**Assumptions (protect in threat model):**
- Supabase project is not compromised
- Service role key is never exposed in browser or logs
- Journalist email is treated as identity (for pre-signup invitations)
- IP address logging is for analytics only, not audit/enforcement

---

### Monitoring & Alerts (Post-MVP)

Recommend:
- Alert on failed RPC calls to `consume_download_token`
- Alert on high rate of 403 errors from `/api/assets/download`
- Monitor `asset_download_events` insertion latency
- Dashboard: downloads per asset, per brand, per journalist

---

### Deferred Items (Post-MVP)

- [ ] Persistent conversation history for journalist AI assistant
- [ ] Vector embedding retrieval (pgvector)
- [ ] One-time-use token binding via database (current: 60s TTL only)
- [ ] Scheduled cleanup of expired tokens (24h+ old)
- [ ] Scheduled cleanup of download events (12+ months old)
- [ ] Journalist-facing UI to view "exclusive invitations" waiting for embargo lift
- [ ] Brand-facing featured placement marketplace (paid feature)
- [ ] Organisations table for agency multi-brand support
- [ ] Email digest integration (include embargoed assets?)

---

### References

- Spec: `/mnt/project/foundational_prompt.rtf` (Broadbase v5)
- Migration: `009_embargoed_assets.sql`
- API routes: `request-token-route.ts`, `download-route.ts`
- Component: `DownloadAssetButton.tsx`
- Tests: `embargoed_assets_rls_smoke.sql`, `QA_embargoed_assets.md`
