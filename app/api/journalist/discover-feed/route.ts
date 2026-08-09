import { NextResponse } from 'next/server';
import {
  loadJournalistDiscoverFeedReleases,
  mapDiscoverRowsToFeed,
} from '@/lib/journalist/discover-data';
import { parseJournalistSearchFilters } from '@/lib/journalist/search-filters';
import { getJournalistPortalSession } from '@/lib/journalist/session';

export async function GET(request: Request) {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseJournalistSearchFilters({
    beat: url.searchParams.get('beat') ?? undefined,
    since: url.searchParams.get('since') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
  });

  const rows = await loadJournalistDiscoverFeedReleases(
    session.supabase,
    session.user.id,
    filters
  );
  const releases = mapDiscoverRowsToFeed(rows);

  return NextResponse.json(
    { ok: true, releases },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
