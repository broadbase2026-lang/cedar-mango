import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const AssetIdSchema = z.string().uuid();

/**
 * GET /api/analytics/asset-download?assetId=[uuid]
 * Authenticated journalist download proxy for public assets.
 * Logs to asset_download_events then redirects to the asset file URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const assetIdRaw = url.searchParams.get('assetId');
  const parsed = AssetIdSchema.safeParse(assetIdRaw);

  if (!parsed.success) {
    return new Response('Invalid asset ID', { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user || authError) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.user_type !== 'journalist') {
    return new Response('Forbidden', { status: 403 });
  }

  const { data: journalistProfile } = await supabase
    .from('journalist_profiles')
    .select('is_inactive')
    .eq('id', user.id)
    .maybeSingle();

  if (journalistProfile?.is_inactive) {
    return new Response('Forbidden', { status: 403 });
  }

  const { data: asset, error: assetError } = await supabase
    .from('press_assets')
    .select(
      'id, file_url, brand_id, press_release_id, press_releases(status, deleted_at)'
    )
    .eq('id', parsed.data)
    .is('deleted_at', null)
    .maybeSingle();

  if (assetError || !asset?.file_url || !asset.brand_id) {
    return new Response('Asset not found', { status: 404 });
  }

  const releaseRow = Array.isArray(asset.press_releases)
    ? asset.press_releases[0]
    : asset.press_releases;

  if (
    !releaseRow ||
    releaseRow.status !== 'published' ||
    releaseRow.deleted_at
  ) {
    return new Response('Asset not found', { status: 404 });
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent') || null;

  try {
    const admin = createAdminClient();
    void admin
      .from('asset_download_events')
      .insert({
        user_id: user.id,
        asset_id: asset.id,
        brand_id: asset.brand_id,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .then(({ error }) => {
        if (error) {
          console.error('[asset-download] telemetry insert failed:', error.message);
        }
      });
  } catch (err) {
    console.error('[asset-download] admin client unavailable:', err);
  }

  return NextResponse.redirect(asset.file_url);
}
