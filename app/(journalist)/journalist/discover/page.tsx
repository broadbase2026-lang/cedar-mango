import { JournalistDiscoverView } from '@/components/journalist/journalist-discover-view';
import {
  loadJournalistDiscoverData,
  loadJournalistDiscoverSearchRows,
  mapDiscoverRowsToFeed,
} from '@/lib/journalist/discover-data';
import { getJournalistPortalSession } from '@/lib/journalist/session';

type PageProps = {
  searchParams?: { q?: string };
};

export default async function JournalistDiscoverPage({ searchParams }: PageProps) {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    // Layout handles redirect; keep component shape simple.
    return <JournalistDiscoverView userDisplayName={null} />;
  }

  const searchQuery = (searchParams?.q ?? '').trim();

  if (searchQuery) {
    const rows = await loadJournalistDiscoverSearchRows(
      session.supabase,
      session.user.id,
      searchQuery
    );
    const releases = mapDiscoverRowsToFeed(rows);

    return (
      <JournalistDiscoverView
        userDisplayName={session.displayName}
        releases={releases}
        searchQuery={searchQuery}
      />
    );
  }

  const discoverData = await loadJournalistDiscoverData(session.supabase, session.user.id);
  const releases = mapDiscoverRowsToFeed(discoverData.recentReleases);

  return (
    <JournalistDiscoverView userDisplayName={session.displayName} releases={releases} />
  );
}
