type PageProps = {
  params: { 'folder-id': string };
};

import { notFound } from 'next/navigation';
import { JournalistFolderDetailView } from '@/components/journalist/journalist-folder-detail-view';
import { getJournalistPortalSession } from '@/lib/journalist/session';
import { loadFolderDetail } from '@/lib/journalist/folders-data';

export default async function JournalistFolderDetailPage({ params }: PageProps) {
  const { 'folder-id': folderId } = params;

  const session = await getJournalistPortalSession();
  if (!session.ok) return null;

  const folder = await loadFolderDetail({
    supabase: session.supabase,
    journalistId: session.user.id,
    folderId,
  });

  if (!folder) notFound();
  return <JournalistFolderDetailView folder={folder} />;
}
