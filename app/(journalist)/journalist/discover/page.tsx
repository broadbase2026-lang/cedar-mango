import { JournalistDiscoverView } from '@/components/journalist/journalist-discover-view';
import {
  loadJournalistDiscoverData,
  mapDiscoverRowsToFeed,
} from '@/lib/journalist/discover-data';
import { getJournalistPortalSession } from '@/lib/journalist/session';

export default async function JournalistDiscoverPage() {
  const session = await getJournalistPortalSession();
  if (!session.ok) {
    // Layout handles redirect; keep component shape simple.
    return <JournalistDiscoverView userDisplayName={null} />;
  }

  const discoverData = await loadJournalistDiscoverData(
    session.supabase,
    session.user.id
  );
  const releases = mapDiscoverRowsToFeed(discoverData.recentReleases);

  return (
    <JournalistDiscoverView
      userDisplayName={session.displayName}
      releases={releases}
    />
  );
}
