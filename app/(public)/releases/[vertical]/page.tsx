import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';
import {
  ArchivePagination,
  PublicReleaseList,
} from '@/components/public/public-release-list';
import { loadArchiveReleases } from '@/lib/public/load-archive-releases';
import { appBaseUrl } from '@/lib/seo/app-base-url';
import {
  isArchiveDirectoryVertical,
  labelVertical,
  type ArchiveDirectoryVertical,
} from '@/lib/seo/verticals';

export const revalidate = 60;

type PageProps = {
  params: { vertical: string };
  searchParams?: { page?: string };
};

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function generateStaticParams(): { vertical: ArchiveDirectoryVertical }[] {
  return [
    { vertical: 'fnb' },
    { vertical: 'travel' },
    { vertical: 'culture' },
    { vertical: 'fashion' },
    { vertical: 'lifestyle' },
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!isArchiveDirectoryVertical(params.vertical)) {
    return { title: 'Vertical not found' };
  }

  const label = labelVertical(params.vertical) ?? params.vertical;
  const base = appBaseUrl();
  const url = `${base}/releases/${params.vertical}`;
  const title = `${label} Press Releases — Broadbase`;
  const description = `Browse published ${label} press releases on Broadbase.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function VerticalArchivePage({
  params,
  searchParams,
}: PageProps) {
  if (!isArchiveDirectoryVertical(params.vertical)) {
    notFound();
  }

  const vertical = params.vertical;
  const label = labelVertical(vertical) ?? vertical;
  const page = parsePage(searchParams?.page);
  const result = await loadArchiveReleases({ vertical, page });
  const base = appBaseUrl();
  const pageUrl = `${base}/releases/${vertical}`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${label} press releases`,
    numberOfItems: result.total,
    itemListElement: result.releases.map((release, index) => ({
      '@type': 'ListItem',
      position: (result.page - 1) * result.pageSize + index + 1,
      url: `${base}/release/${release.slug}`,
      name: release.title,
    })),
  };

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${base}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Releases',
        item: `${base}/releases`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: label,
        item: pageUrl,
      },
    ],
  };

  const hrefForPage = (p: number) =>
    p > 1 ? `/releases/${vertical}?page=${p}` : `/releases/${vertical}`;

  return (
    <main className="min-h-screen bg-surface-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }}
      />
      <PublicSiteHeader />
      <div className="bb-container max-w-4xl py-10">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-text-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/releases" className="hover:underline">
                Releases
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-text-primary" aria-current="page">
              {label}
            </li>
          </ol>
        </nav>

        <div className="mb-8">
          <h1 className="font-heading text-3xl font-normal text-text-primary">
            {label} press releases
          </h1>
          <p className="mt-2 text-text-secondary">
            {result.total} published release
            {result.total === 1 ? '' : 's'} in this vertical.
          </p>
        </div>

        <PublicReleaseList
          releases={result.releases}
          emptyMessage={`No published ${label} releases yet.`}
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
