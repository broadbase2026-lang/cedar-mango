import { JournalistDiscoverView } from '@/components/journalist/journalist-discover-view';
import {
  loadJournalistDiscoverData,
  loadJournalistDiscoverSearchRows,
  mapDiscoverRowsToFeed,
} from '@/lib/journalist/discover-data';
import { parseJournalistSearchFilters } from '@/lib/journalist/search-filters';
import { getJournalistPortalSession } from '@/lib/journalist/session';

type PageProps = {
  searchParams?: {
    q?: string;
    beat?: string;
    since?: string;
    sort?: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function JournalistDiscoverPage({ searchParams }: PageProps) {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    // Layout handles redirect; keep component shape simple.
    return <JournalistDiscoverView userDisplayName={null} />;
  }

  const searchQuery = (searchParams?.q ?? '').trim();
  const searchFilters = parseJournalistSearchFilters({
    beat: searchParams?.beat,
    since: searchParams?.since,
    sort: searchParams?.sort,
  });

  if (searchQuery) {
    const rows = await loadJournalistDiscoverSearchRows(
      session.supabase,
      session.user.id,
      searchQuery,
      searchFilters
    );
    const releases = mapDiscoverRowsToFeed(rows);

    return (
      <JournalistDiscoverView
        userDisplayName={session.displayName}
        releases={releases}
        searchQuery={searchQuery}
        searchFilters={searchFilters}
      />
    );
  }

  const discoverData = await loadJournalistDiscoverData(session.supabase, session.user.id);
  const releases = mapDiscoverRowsToFeed(discoverData.recentReleases);

  return (
    <JournalistDiscoverView userDisplayName={session.displayName} releases={releases} />
  );
}
