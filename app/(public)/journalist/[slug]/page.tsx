import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type {
  JournalistPortfolioSettings,
  JournalistPublication,
  PublicPortfolioData,
} from '@/types';

export const revalidate = 60;

type PageProps = {
  params: { slug: string };
};

// Anon, cookieless client: keeps the page statically generatable (ISR)
// and ensures RLS public-read policies enforce visibility for the
// portfolio content (settings + publications).
function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or anon key');
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formatPublishedAt(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function loadPortfolio(slug: string): Promise<PublicPortfolioData | null> {
  const anon = createAnonClient();

  // RLS public-read policy only returns rows where public = true.
  // A missing or private portfolio therefore yields null.
  const { data: settingsRow } = await anon
    .from('journalist_portfolio_settings')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  const settings = settingsRow as JournalistPortfolioSettings | null;
  if (!settings) return null;

  // Safe display fields only — never select email or linkedin_url here.
  const admin = createAdminClient();

  const { data: profileRow } = await admin
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', settings.journalist_id)
    .maybeSingle();

  const { data: journalistProfileRow } = await admin
    .from('journalist_profiles')
    .select('publication, beats, bio')
    .eq('id', settings.journalist_id)
    .maybeSingle();

  // RLS public-portfolio-read returns only non-deleted rows for public
  // portfolios; the explicit filters below are belt-and-braces.
  const { data: publicationRows } = await anon
    .from('journalist_publications')
    .select('*')
    .eq('journalist_id', settings.journalist_id)
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  const publications = (publicationRows ?? []) as JournalistPublication[];

  // press_releases has no anon-read policy; resolve slugs via admin,
  // limited to publicly-visible releases so source links never 404.
  const releaseIds = Array.from(
    new Set(
      publications
        .map((p) => p.press_release_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const slugByReleaseId = new Map<string, string>();
  if (releaseIds.length > 0) {
    const { data: releaseRows } = await admin
      .from('press_releases')
      .select('id, slug')
      .in('id', releaseIds)
      .eq('status', 'published')
      .is('deleted_at', null)
      .in('moderation_status', ['pending', 'approved']);

    for (const row of (releaseRows ?? []) as { id: string; slug: string }[]) {
      slugByReleaseId.set(row.id, row.slug);
    }
  }

  return {
    settings,
    profile: {
      full_name: profileRow?.full_name ?? null,
      avatar_url: profileRow?.avatar_url ?? null,
      beats: journalistProfileRow?.beats ?? [],
      publication: journalistProfileRow?.publication ?? null,
      bio: journalistProfileRow?.bio ?? null,
    },
    publications: publications.map((p) => ({
      ...p,
      press_release_slug: p.press_release_id
        ? slugByReleaseId.get(p.press_release_id) ?? null
        : null,
    })),
    total_count: publications.length,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from('journalist_portfolio_settings')
    .select('journalist_id, public')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!settings?.public) {
    return { robots: { index: false, follow: false } };
  }

  const { data: journalistProfile } = await admin
    .from('journalist_profiles')
    .select('is_inactive')
    .eq('id', settings.journalist_id)
    .maybeSingle();

  if (journalistProfile?.is_inactive) {
    return { robots: { index: false, follow: false } };
  }

  return {};
}

export default async function JournalistPortfolioPage({ params }: PageProps) {
  const data = await loadPortfolio(params.slug);
  if (!data) notFound();

  const { settings, profile, publications, total_count } = data;
  const displayName = profile.full_name ?? settings.slug;
  const bio = settings.bio ?? profile.bio;

  const socialLinks = [
    { label: 'Twitter', href: settings.twitter_url },
    { label: 'LinkedIn', href: settings.linkedin_url },
    { label: 'Website', href: settings.website_url },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  const sameAs = [
    settings.twitter_url,
    settings.linkedin_url,
    settings.website_url,
  ].filter((url): url is string => Boolean(url));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: displayName,
      ...(bio ? { description: bio } : {}),
      ...(sameAs.length > 0 ? { sameAs } : {}),
    },
  };

  return (
    <main className="min-h-screen bg-surface-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicSiteHeader />
      <div className="bb-container max-w-3xl py-12">
        <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-white">
              {initialsFrom(displayName)}
            </div>
          )}

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-normal text-text-primary">
              {displayName}
            </h1>
            {profile.publication ? (
              <p className="text-text-secondary">{profile.publication}</p>
            ) : null}
            {bio ? <p className="text-sm text-text-primary">{bio}</p> : null}

            {profile.beats.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {profile.beats.map((beat) => (
                  <Badge key={beat} status="neutral">
                    {beat}
                  </Badge>
                ))}
              </div>
            ) : null}

            {socialLinks.length > 0 ? (
              <div className="flex flex-wrap gap-4 pt-1 text-sm">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent hover:underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}

            <p className="pt-1 text-sm font-medium text-text-secondary">
              {total_count} {total_count === 1 ? 'article' : 'articles'} published
            </p>
          </div>
        </header>

        <section className="mt-10 space-y-4">
          {publications.length === 0 ? (
            <p className="text-text-secondary">No articles published yet.</p>
          ) : (
            publications.map((article) => (
              <Card key={article.id}>
                <h2 className="font-heading text-xl text-text-primary">
                  <a
                    href={article.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {article.article_headline}
                  </a>
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {article.publication_name} ·{' '}
                  {formatPublishedAt(article.published_at)}
                </p>
                {article.press_release_slug ? (
                  <Link
                    href={`/release/${article.press_release_slug}`}
                    className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
                  >
                    Source release →
                  </Link>
                ) : null}
              </Card>
            ))
          )}
        </section>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
