// app/api/assets/request-token/route.ts
// ============================================================
// POST /api/assets/request-token
// ============================================================
// Validates that the authenticated journalist has an invitation
// for the requested asset, checks that the embargo has lifted,
// and returns a short-lived (60-second), single-use token.

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

const RequestTokenSchema = z.object({
  assetId: z.string().uuid('Invalid asset ID'),
});

export async function POST(request: Request) {
  try {
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

    const { data: profile } = await auth
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.user_type !== 'journalist') {
      return Response.json(
        { success: false, error: 'You do not have access to this asset' },
        { status: 403 }
      );
    }

    const { data: journalistProfile } = await auth
      .from('journalist_profiles')
      .select('is_inactive')
      .eq('id', user.id)
      .maybeSingle();

    if (journalistProfile?.is_inactive) {
      return Response.json(
        { success: false, error: 'You do not have access to this asset' },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const parsed = RequestTokenSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { assetId } = parsed.data;

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return Response.json(
        { success: false, error: 'Server misconfigured.' },
        { status: 503 }
      );
    }

    const baseQuery = () =>
      admin
        .from('asset_invitations')
        .select('embargo_until')
        .eq('asset_id', assetId)
        .is('revoked_at', null);

    let invitation: { embargo_until: string | null } | null = null;
    let invError: { message: string } | null = null;

    const byUser = await baseQuery().eq('invited_user_id', user.id).maybeSingle();
    if (byUser.error) {
      invError = byUser.error;
    } else if (byUser.data) {
      invitation = byUser.data;
    } else if (user.email) {
      const byEmail = await baseQuery()
        .eq('invited_email', user.email)
        .maybeSingle();
      invitation = byEmail.data ?? null;
      invError = byEmail.error ?? null;
    }

    if (invError || !invitation) {
      return Response.json(
        { success: false, error: 'You do not have access to this asset' },
        { status: 403 }
      );
    }

    if (invitation.embargo_until) {
      const embargoTime = new Date(invitation.embargo_until).getTime();
      if (embargoTime > Date.now()) {
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

    const expiresAt = new Date(Date.now() + 60000).toISOString();

    const { data: token, error: tokenError } = await admin
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
