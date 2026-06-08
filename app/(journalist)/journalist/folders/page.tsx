import { JournalistFoldersView } from '@/components/journalist/journalist-folders-view';
import { getJournalistPortalSession } from '@/lib/journalist/session';
import { loadFolderList } from '@/lib/journalist/folders-data';

export default async function JournalistFoldersPage() {
  const session = await getJournalistPortalSession();
  if (!session.ok) return null;

  const folders = await loadFolderList({
    supabase: session.supabase,
    journalistId: session.user.id,
  });

  return <JournalistFoldersView folders={folders} />;
}
