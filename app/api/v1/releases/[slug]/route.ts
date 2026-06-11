import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PUBLIC_RELEASE_SELECT, mapReleaseRows } from '@/lib/api/public-releases';

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

type RouteContext = {
  params: { slug: string };
};

export async function GET(
  _req: Request,
  context: RouteContext,
): Promise<Response> {
  const { slug } = context.params;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Server misconfigured' },
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from('press_releases')
    .select(PUBLIC_RELEASE_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .or(`embargo_until.is.null,embargo_until.lte.${nowIso}`)
    .in('moderation_status', ['pending', 'approved'])
    .eq('press_assets.is_hero', true)
    .is('press_assets.deleted_at', null)
    .limit(1);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  const release = mapReleaseRows(data)[0];
  if (!release) {
    return NextResponse.json(
      { success: false, error: 'Release not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { success: true, data: release },
    { status: 200, headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}
