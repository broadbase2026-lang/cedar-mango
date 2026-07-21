import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';
import {
  ArchivePagination,
  PublicReleaseList,
} from '@/components/public/public-release-list';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadArchiveReleases } from '@/lib/public/load-archive-releases';
import { appBaseUrl } from '@/lib/seo/app-base-url';
import {
  ARCHIVE_DIRECTORY_VERTICALS,
  labelVertical,
} from '@/lib/seo/verticals';

export const revalidate = 60;

type PageProps = {
  searchParams?: { q?: string; page?: string };
};

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const q = searchParams?.q?.trim() ?? '';
  const base = appBaseUrl();
  const title = q
    ? `Search releases: ${q} — Broadbase`
    : 'Press Releases Archive — Broadbase';
  const description = q
    ? `Search results for “${q}” across published Broadbase press releases.`
    : 'Browse published press releases across F&B, travel, culture, fashion, and lifestyle verticals.';
  const canonical = q
    ? `${base}/releases?q=${encodeURIComponent(q)}`
    : `${base}/releases`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function ReleasesArchivePage({ searchParams }: PageProps) {
  const q = searchParams?.q?.trim() ?? '';
  const page = parsePage(searchParams?.page);
  const result = await loadArchiveReleases({ q: q || undefined, page });
  const base = appBaseUrl();

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: q ? `Press release search: ${q}` : 'Broadbase press release archive',
    numberOfItems: result.total,
    itemListElement: result.releases.map((release, index) => ({
      '@type': 'ListItem',
      position: (result.page - 1) * result.pageSize + index + 1,
      url: `${base}/release/${release.slug}`,
      name: release.title,
    })),
  };

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return qs ? `/releases?${qs}` : '/releases';
  };

  return (
    <main className="min-h-screen bg-surface-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <PublicSiteHeader />
      <div className="bb-container max-w-4xl py-10">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-normal text-text-primary">
            {q ? `Search: ${q}` : 'Press releases'}
          </h1>
          <p className="mt-2 text-text-secondary">
            {q
              ? `${result.total} result${result.total === 1 ? '' : 's'} across published releases.`
              : 'Published, non-embargoed releases from verified brands across APAC lifestyle media.'}
          </p>
        </div>

        <form method="get" action="/releases" className="mb-8 flex flex-col gap-3 sm:flex-row">
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search releases…"
            aria-label="Search press releases"
            className="flex-1"
          />
          <Button type="submit" className="sm:w-auto">
            Search
          </Button>
        </form>

        <nav aria-label="Vertical directories" className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {ARCHIVE_DIRECTORY_VERTICALS.map((vertical) => (
            <Link
              key={vertical}
              href={`/releases/${vertical}`}
              className="font-medium text-brand-primary-700 hover:underline"
            >
              {labelVertical(vertical)}
            </Link>
          ))}
        </nav>

        <PublicReleaseList
          releases={result.releases}
          emptyMessage={
            q
              ? 'No releases matched your search.'
              : 'No published releases yet.'
          }
        />
        <ArchivePagination
          page={result.page}
          totalPages={result.totalPages}
          hrefForPage={hrefForPage}
        />
      </div>
      <PublicSiteFooter />
    </main>
  );
}
