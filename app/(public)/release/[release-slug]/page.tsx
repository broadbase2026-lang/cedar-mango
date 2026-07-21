import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { PublicSiteHeader } from '@/components/home/public-site-header';
import { PublicSiteFooter } from '@/components/home/public-site-footer';
import { RichTextRender } from '@/components/rich-text/rich-text-render';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';
import {
  isReleaseEmbargoed,
  loadPublicRelease,
  pickPublicHeroAsset,
} from '@/lib/public/load-public-release';
import { appBaseUrl } from '@/lib/seo/app-base-url';
import {
  labelVertical,
  verticalAdditionalType,
} from '@/lib/seo/verticals';

type PageProps = {
  params: { 'release-slug': string };
};

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params['release-slug'];
  const release = await loadPublicRelease(slug);

  if (!release) {
    return { title: 'Release not found' };
  }

  if (isReleaseEmbargoed(release.embargo_until)) {
    return { robots: { index: false, follow: false } };
  }

  const base = appBaseUrl();
  const url = `${base}/release/${release.slug}`;
  const description =
    release.summary?.trim() ||
    `Press release from ${release.brand?.name ?? 'Broadbase'}.`;
  const hero = pickPublicHeroAsset(release.press_assets);
  const images = hero?.file_url
    ? [{ url: hero.file_url, alt: hero.caption ?? release.title }]
    : undefined;

  return {
    title: release.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: release.title,
      description,
      url,
      publishedTime: release.published_at ?? undefined,
      modifiedTime: release.updated_at,
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: release.title,
      description,
      images: images?.map((img) => img.url),
    },
  };
}

export default async function ReleasePage({ params }: PageProps) {
  const slug = params['release-slug'];
  const release = await loadPublicRelease(slug);
  if (!release) notFound();

  if (isReleaseEmbargoed(release.embargo_until)) {
    noStore();
    return notFound();
  }

  const base = appBaseUrl();
  const releaseUrl = `${base}/release/${release.slug}`;
  const newsroomUrl = release.brand
    ? `${base}/newsroom/${release.brand.slug}`
    : null;

  const tags = Array.isArray(release.tags)
    ? release.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  const wordCount = richTextToPlainText(release.body ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const hero = pickPublicHeroAsset(release.press_assets);
  const verticalLabel = labelVertical(release.industry_vertical);
  const additionalType = verticalAdditionalType(release.industry_vertical);

  const about: Record<string, unknown>[] = tags.map((tag) => ({
    '@type': 'Thing',
    name: tag,
  }));
  if (release.brand && additionalType) {
    about.unshift({
      '@type': 'Organization',
      name: release.brand.name,
      additionalType,
      ...(release.brand.website ? { url: release.brand.website } : {}),
    });
  }

  const publisher = release.brand
    ? {
        '@type': 'Organization',
        name: release.brand.name,
        ...(release.brand.logo_url ? { logo: release.brand.logo_url } : {}),
        ...(newsroomUrl ? { url: newsroomUrl } : {}),
      }
    : undefined;

  const newsArticle: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: release.title,
    url: releaseUrl,
    datePublished: release.published_at ?? undefined,
    dateModified: release.updated_at,
    inLanguage: 'en',
    wordCount,
    isAccessibleForFree: true,
    ...(verticalLabel ? { articleSection: verticalLabel } : {}),
    ...(tags.length > 0 ? { keywords: tags.join(', ') } : {}),
    ...(hero?.file_url ? { image: [hero.file_url] } : {}),
    ...(about.length > 0 ? { about } : {}),
    ...(publisher ? { publisher } : {}),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.release-summary', '.release-headline'],
    },
    mentions: release.brand
      ? {
          '@type': 'Organization',
          name: release.brand.name,
          url: release.brand.website ?? undefined,
          logo: release.brand.logo_url ?? undefined,
        }
      : undefined,
  };

  const breadcrumbItems = [
    { name: 'Home', item: `${base}/` },
    ...(release.brand && newsroomUrl
      ? [{ name: release.brand.name, item: newsroomUrl }]
      : []),
    { name: release.title, item: releaseUrl },
  ];

  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };

  return (
    <main className="min-h-screen bg-surface-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticle) }}
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
            {release.brand ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={`/newsroom/${release.brand.slug}`}
                    className="hover:underline"
                  >
                    {release.brand.name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li className="text-text-primary" aria-current="page">
              Release
            </li>
          </ol>
        </nav>

        <div className="mb-6">
          <h1 className="release-headline font-heading text-3xl font-normal text-text-primary">
            {release.title}
          </h1>
          {release.brand ? (
            <p className="mt-2 text-sm text-text-secondary">
              {release.brand.name} · Published{' '}
              {release.published_at
                ? new Date(release.published_at).toLocaleDateString()
                : '—'}
              {verticalLabel ? ` · ${verticalLabel}` : null}
            </p>
          ) : null}
          {release.summary ? (
            <p className="release-summary mt-4 text-base text-text-primary">
              {release.summary}
            </p>
          ) : null}
        </div>

        {hero?.file_url ? (
          <figure className="mb-6 overflow-hidden rounded-2xl border border-border-default bg-white">
            <div className="relative aspect-[16/9] w-full">
              <Image
                src={hero.file_url}
                alt={hero.caption ?? release.title}
                fill
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
                priority
              />
            </div>
            {hero.caption ? (
              <figcaption className="border-t border-border-default px-4 py-2 text-sm text-text-secondary">
                {hero.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <article className="rounded-2xl border border-border-default bg-white p-6 shadow-sm">
          <RichTextRender html={release.body ?? ''} className="bb-richtext" />
        </article>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
