import { notFound } from 'next/navigation';
import { JournalistReleaseView } from '@/components/journalist/journalist-release-view';
import { getJournalistPortalSession } from '@/lib/journalist/session';
import { loadJournalistReleaseBySlug } from '@/lib/journalist/release-data';
import { loadFolderList } from '@/lib/journalist/folders-data';

type PageProps = {
  params: { 'release-slug': string };
};

export default async function JournalistReleasePage({ params }: PageProps) {
  const session = await getJournalistPortalSession();
  if (!session.ok) return null;

  const slug = params['release-slug'];

  const [release, folders, { data: pubRows }] = await Promise.all([
    loadJournalistReleaseBySlug({
      supabase: session.supabase,
      journalistId: session.user.id,
      slug,
    }),
    loadFolderList({ supabase: session.supabase, journalistId: session.user.id }),
    session.supabase
      .from('journalist_publications')
      .select('publication_name')
      .eq('journalist_id', session.user.id)
      .is('deleted_at', null),
  ]);

  if (!release) notFound();

  const publicationNameSuggestions = Array.from(
    new Set(
      ((pubRows ?? []) as { publication_name: string }[]).map(
        (r) => r.publication_name
      )
    )
  );

  return (
    <JournalistReleaseView
      release={release}
      folders={folders}
      publicationNameSuggestions={publicationNameSuggestions}
    />
  );
}

