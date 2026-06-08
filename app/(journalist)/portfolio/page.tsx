import { getJournalistPortalSession } from '@/lib/journalist/session';
import { JournalistPortfolioView } from '@/components/journalist/journalist-portfolio-view';
import type {
  JournalistPortfolioSettings,
  JournalistPublication,
} from '@/types';

export default async function PortfolioPage() {
  const session = await getJournalistPortalSession();
  if (!session.ok) return null;

  const supabase = session.supabase;
  const userId = session.user.id;

  // Owner-read RLS returns the journalist's own rows including soft-deleted.
  const [{ data: settingsRow }, { data: publicationRows }] = await Promise.all([
    supabase
      .from('journalist_portfolio_settings')
      .select('*')
      .eq('journalist_id', userId)
      .maybeSingle(),
    supabase
      .from('journalist_publications')
      .select('*')
      .eq('journalist_id', userId)
      .order('published_at', { ascending: false }),
  ]);

  const publications = (publicationRows ?? []) as JournalistPublication[];

  // Resolve source-release slugs (journalist-read RLS returns published rows).
  const releaseIds = Array.from(
    new Set(
      publications
        .map((p) => p.press_release_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const slugByReleaseId = new Map<string, string>();
  if (releaseIds.length > 0) {
    const { data: releaseRows } = await supabase
      .from('press_releases')
      .select('id, slug')
      .in('id', releaseIds);
    for (const row of (releaseRows ?? []) as { id: string; slug: string }[]) {
      slugByReleaseId.set(row.id, row.slug);
    }
  }

  const withSlug = publications.map((p) => ({
    ...p,
    press_release_slug: p.press_release_id
      ? slugByReleaseId.get(p.press_release_id) ?? null
      : null,
  }));

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://broadbase.app';

  return (
    <JournalistPortfolioView
      settings={(settingsRow as JournalistPortfolioSettings | null) ?? null}
      publications={withSlug}
      appBaseUrl={appBaseUrl}
      hasEmail={Boolean(session.email)}
    />
  );
}
