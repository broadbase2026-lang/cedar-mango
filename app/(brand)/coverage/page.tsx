import Link from 'next/link';
import { getBrandPortalSession } from '@/lib/brand/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { JournalistPublication } from '@/types';

function formatPublishedAt(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type CoverageRow = {
  id: string;
  article_headline: string;
  article_url: string;
  publication_name: string;
  published_at: string;
  journalistName: string | null;
  journalistSlug: string | null;
  beats: string[];
  releaseSlug: string | null;
  releaseTitle: string | null;
};

export default async function BrandCoveragePage() {
  const session = await getBrandPortalSession();
  if (!session.ok) return null;

  const supabase = session.supabase;

  // RLS scopes press_releases to brands this user owns.
  const { data: releaseRows } = await supabase
    .from('press_releases')
    .select('id, slug, title')
    .is('deleted_at', null);

  const releases = (releaseRows ?? []) as {
    id: string;
    slug: string;
    title: string;
  }[];
  const releaseById = new Map(releases.map((r) => [r.id, r]));
  const releaseIds = releases.map((r) => r.id);

  let rows: CoverageRow[] = [];

  if (releaseIds.length > 0) {
    // RLS brand-read policy returns only non-deleted publications for
    // journalists whose portfolio is public.
    const { data: publicationRows } = await supabase
      .from('journalist_publications')
      .select('*')
      .in('press_release_id', releaseIds)
      .order('published_at', { ascending: false });

    const publications = (publicationRows ?? []) as JournalistPublication[];

    const journalistIds = Array.from(
      new Set(publications.map((p) => p.journalist_id))
    );

    const nameByJournalist = new Map<string, string | null>();
    const slugByJournalist = new Map<string, string>();
    const profileByJournalist = new Map<
      string,
      { publication: string | null; beats: string[] }
    >();

    if (journalistIds.length > 0) {
      // full_name: profiles has no brand-read RLS, so use admin and select
      // ONLY the safe display column — never email or any contact field.
      const admin = createAdminClient();
      const { data: profileRows } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', journalistIds);
      for (const row of (profileRows ?? []) as {
        id: string;
        full_name: string | null;
      }[]) {
        nameByJournalist.set(row.id, row.full_name);
      }

      // Portfolio slug for the public portfolio link (public-read RLS).
      const { data: settingsRows } = await supabase
        .from('journalist_portfolio_settings')
        .select('journalist_id, slug')
        .in('journalist_id', journalistIds);
      for (const row of (settingsRows ?? []) as {
        journalist_id: string;
        slug: string;
      }[]) {
        slugByJournalist.set(row.journalist_id, row.slug);
      }

      // Publication + beats only — never select linkedin_url (journalist-private).
      const { data: jpRows } = await supabase
        .from('journalist_profiles')
        .select('id, publication, beats')
        .in('id', journalistIds);
      for (const row of (jpRows ?? []) as {
        id: string;
        publication: string | null;
        beats: string[] | null;
      }[]) {
        profileByJournalist.set(row.id, {
          publication: row.publication ?? null,
          beats: row.beats ?? [],
        });
      }
    }

    rows = publications.map((p) => {
      const release = p.press_release_id
        ? releaseById.get(p.press_release_id) ?? null
        : null;
      return {
        id: p.id,
        article_headline: p.article_headline,
        article_url: p.article_url,
        publication_name: p.publication_name,
        published_at: p.published_at,
        journalistName: nameByJournalist.get(p.journalist_id) ?? null,
        journalistSlug: slugByJournalist.get(p.journalist_id) ?? null,
        beats: profileByJournalist.get(p.journalist_id)?.beats ?? [],
        releaseSlug: release?.slug ?? null,
        releaseTitle: release?.title ?? null,
      };
    });
  }

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="bb-dash-eyebrow">
          <div>
            <h2 className="bb-dash-section-title">Coverage</h2>
            <p className="bb-dash-section-desc">
              Articles journalists have logged against your releases.
            </p>
          </div>
        </div>

        <section className="mt-8 space-y-4">
          {rows.length === 0 ? (
            <p className="text-text-secondary">
              No verified coverage yet. Coverage appears here when journalists
              log articles they&apos;ve published.
            </p>
          ) : (
            rows.map((row) => (
              <Card key={row.id}>
                <h3 className="text-lg text-text-primary">
                  <a
                    href={row.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {row.article_headline}
                  </a>
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {row.publication_name} · {formatPublishedAt(row.published_at)}
                </p>

                <p className="mt-2 text-sm text-text-secondary">
                  By{' '}
                  {row.journalistSlug ? (
                    <Link
                      href={`/journalist/${row.journalistSlug}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {row.journalistName ?? 'View portfolio'}
                    </Link>
                  ) : (
                    <span className="font-medium text-text-primary">
                      {row.journalistName ?? 'Unknown'}
                    </span>
                  )}
                </p>

                {row.beats.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.beats.map((beat) => (
                      <Badge key={beat} status="neutral">
                        {beat}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {row.releaseSlug ? (
                  <p className="mt-3 text-sm">
                    <span className="text-text-secondary">Based on: </span>
                    <Link
                      href={`/release/${row.releaseSlug}`}
                      className="font-medium text-accent hover:underline"
                    >
                      {row.releaseTitle ?? 'View release'}
                    </Link>
                  </p>
                ) : null}
              </Card>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
