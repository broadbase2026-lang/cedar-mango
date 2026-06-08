// app/api/assets/request-token/route.ts
// ============================================================
// POST /api/assets/request-token
// ============================================================
// Validates that the authenticated journalist has an invitation
// for the requested asset, checks that the embargo has lifted,
// and returns a short-lived (60-second), single-use token.
//
// Response: { success: boolean, data?: { token: string }, error?: string }

import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const RequestTokenSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
});

export async function POST(request: Request) {
  try {
    // ============================================================
    // Step 1: Authenticate user (must be journalist)
    // ============================================================
    const auth = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser();

    if (!user || authError) {
      return Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================
    // Step 2: Validate request body with Zod
    // ============================================================
    const parsed = RequestTokenSchema.safeParse(await request.json());

    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { assetId } = parsed.data;

    // ============================================================
    // Step 3: Initialize Supabase service role client
    // ============================================================
    // Using service role because we need to write to download_tokens
    // and check asset_invitations without RLS restrictions.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ============================================================
    // Step 4: Verify user has an active (non-revoked) invitation
    // ============================================================
    // Check two conditions:
    // 1. An invitation exists matching invited_user_id or invited_email
    // 2. The invitation has not been revoked (revoked_at IS NULL)
    const { data: invitation, error: invError } = await supabase
      .from('asset_invitations')
      .select('embargo_until')
      .eq('asset_id', assetId)
      .or(
        `invited_user_id.eq.${user.id},invited_email.eq.${user.email}`
      )
      .is('revoked_at', null)
      .single();

    if (invError || !invitation) {
      // Intentionally generic: do not reveal whether asset exists or
      // invitation exists. This prevents probing attacks.
      return Response.json(
        { success: false, error: 'You do not have access to this asset' },
        { status: 403 }
      );
    }

    // ============================================================
    // Step 5: Check embargo timestamp
    // ============================================================
    // If embargo_until is in the future, deny access.
    if (invitation.embargo_until) {
      const embargoTime = new Date(invitation.embargo_until).getTime();
      const now = Date.now();

      if (embargoTime > now) {
        return Response.json(
          {
            success: false,
            error: 'This asset is still embargoed',
            embargoUntil: invitation.embargo_until,
          },
          { status: 403 }
        );
      }
    }

    // ============================================================
    // Step 6: Create download token (expires in 60 seconds)
    // ============================================================
    const expiresAt = new Date(Date.now() + 60000).toISOString();

    const { data: token, error: tokenError } = await supabase
      .from('download_tokens')
      .insert({
        user_id: user.id,
        asset_id: assetId,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (tokenError || !token) {
      console.error('[request-token] Token creation failed:', {
        error: tokenError?.message,
        assetId,
        userId: user.id,
      });

      return Response.json(
        { success: false, error: 'Failed to generate download token' },
        { status: 500 }
      );
    }

    // ============================================================
    // Step 7: Return token to client
    // ============================================================
    return Response.json(
      {
        success: true,
        data: { token: token.id },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[request-token] Unhandled error:', error);

    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
