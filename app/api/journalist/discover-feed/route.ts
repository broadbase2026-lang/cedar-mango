import { NextResponse } from 'next/server';
import {
  loadJournalistDiscoverFeedReleases,
  mapDiscoverRowsToFeed,
} from '@/lib/journalist/discover-data';
import { getJournalistPortalSession } from '@/lib/journalist/session';

export async function GET() {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }

  const rows = await loadJournalistDiscoverFeedReleases(
    session.supabase,
    session.user.id
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
