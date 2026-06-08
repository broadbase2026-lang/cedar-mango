import { getJournalistPortalSession } from '@/lib/journalist/session';
import { PortfolioSettingsForm } from '@/components/journalist/portfolio-settings-form';
import type { JournalistPortfolioSettings } from '@/types';

export default async function PortfolioSettingsPage() {
  const session = await getJournalistPortalSession();
  if (!session.ok) return null;

  const { data: settingsRow } = await session.supabase
    .from('journalist_portfolio_settings')
    .select('*')
    .eq('journalist_id', session.user.id)
    .maybeSingle();

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://broadbase.app';

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="font-heading text-2xl text-text-primary">
        Portfolio settings
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Control your public portfolio page and the links shown on it.
      </p>
      <div className="mt-6">
        <PortfolioSettingsForm
          settings={(settingsRow as JournalistPortfolioSettings | null) ?? null}
          hasEmail={Boolean(session.email)}
          appBaseUrl={appBaseUrl}
        />
      </div>
    </div>
  );
}
