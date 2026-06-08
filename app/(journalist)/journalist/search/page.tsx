import { JournalistSearchView } from '@/components/journalist/journalist-search-view';
import { getJournalistPortalSession } from '@/lib/journalist/session';
import { loadJournalistDiscoverData } from '@/lib/journalist/discover-data';
import { loadJournalistSearchData } from '@/lib/journalist/search-data';

type PageProps = {
  searchParams: { q?: string; vertical?: string };
};

export default async function JournalistSearchPage({ searchParams }: PageProps) {
  const session = await getJournalistPortalSession();
  if (!session.ok) return null;

  const q = (searchParams.q ?? '').toString();
  const vertical = (searchParams.vertical ?? 'all').toString();

  const [discover, search, { data: pubRows }] = await Promise.all([
    loadJournalistDiscoverData(session.supabase, session.user.id),
    loadJournalistSearchData({
      supabase: session.supabase,
      journalistId: session.user.id,
      q,
      vertical,
    }),
    session.supabase
      .from('journalist_publications')
      .select('publication_name')
      .eq('journalist_id', session.user.id)
      .is('deleted_at', null),
  ]);

  const publicationNameSuggestions = Array.from(
    new Set(
      ((pubRows ?? []) as { publication_name: string }[]).map(
        (r) => r.publication_name
      )
    )
  );

  return (
    <JournalistSearchView
      q={q}
      vertical={vertical}
      folders={discover.folders}
      results={search.results}
      publicationNameSuggestions={publicationNameSuggestions}
    />
  );
}
