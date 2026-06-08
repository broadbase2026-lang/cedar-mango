import { redirect } from 'next/navigation';
import { isBetaTrialOnly } from '@/lib/config/beta';
import { BrandSettingsView } from '@/components/brand/brand-settings-view';
import { loadBrandSettingsSnapshot } from '@/lib/brand/settings-data';
import { getBrandPortalSession } from '@/lib/brand/session';

export default async function BrandSettingsPage() {
  const session = await getBrandPortalSession();
  if (!session.ok) {
    redirect('/login');
  }

  const snapshot = await loadBrandSettingsSnapshot(
    session.supabase,
    session.user.id
  );

  return <BrandSettingsView snapshot={snapshot} betaTrialOnly={isBetaTrialOnly} />;
}
