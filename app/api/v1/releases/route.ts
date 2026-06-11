import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  PUBLIC_RELEASE_SELECT,
  RELEASE_VERTICALS,
  mapReleaseRows,
} from '@/lib/api/public-releases';

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  vertical: z.enum(RELEASE_VERTICALS).optional(),
});

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    page: url.searchParams.get('page') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    vertical: url.searchParams.get('vertical') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid query parameters' },
      { status: 400 },
    );
  }

  const { page, limit, vertical } = parsed.data;

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
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin
    .from('press_releases')
    .select(PUBLIC_RELEASE_SELECT, { count: 'exact' })
    .eq('status', 'published')
    .is('deleted_at', null)
    .or(`embargo_until.is.null,embargo_until.lte.${nowIso}`)
    .in('moderation_status', ['pending', 'approved'])
    .eq('press_assets.is_hero', true)
    .is('press_assets.deleted_at', null);

  if (vertical) {
    query = query.eq('industry_vertical', vertical);
  }

  const { data, count, error } = await query
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  const total = count ?? 0;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return NextResponse.json(
    {
      success: true,
      data: {
        releases: mapReleaseRows(data),
        pagination: { page, limit, total, total_pages: totalPages },
      },
    },
    { status: 200, headers: { 'Cache-Control': CACHE_CONTROL } },
  );
}
