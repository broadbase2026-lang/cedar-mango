import { JournalistSettingsView } from '@/components/journalist/journalist-settings-view';
import { getJournalistPortalSession } from '@/lib/journalist/session';
import { loadJournalistSettingsSnapshot } from '@/lib/journalist/settings-data';

export default async function JournalistSettingsPage() {
  const session = await getJournalistPortalSession();
  if (!session.ok) return null;

  const snapshot = await loadJournalistSettingsSnapshot({
    supabase: session.supabase,
    userId: session.user.id,
  });

  return <JournalistSettingsView snapshot={snapshot} />;
}
