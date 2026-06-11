import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { RichTextRender } from '@/components/rich-text/rich-text-render';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';

type PageProps = {
  params: { 'release-slug': string };
};

export const revalidate = 60;

async function loadPublicRelease(slug: string) {
  const admin = createAdminClient();
  const { data: pr } = await admin
    .from('press_releases')
    .select(
      'id, title, slug, summary, body, published_at, updated_at, tags, embargo_until, brand_id, moderation_status'
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .is('deleted_at', null)
    .in('moderation_status', ['pending', 'approved'])
    .maybeSingle();

  if (!pr) return null;

  const { data: brand } = pr.brand_id
    ? await admin
        .from('brands')
        .select('id, name, slug, logo_url, website')
        .eq('id', pr.brand_id)
        .is('deleted_at', null)
        .maybeSingle()
    : { data: null };

  return { ...pr, brand };
}

export default async function ReleasePage({ params }: PageProps) {
  const slug = params['release-slug'];
  const release = await loadPublicRelease(slug);
  if (!release) notFound();

  if (release.embargo_until && new Date(release.embargo_until) > new Date()) {
    noStore();
    return notFound();
  }

  const tags = Array.isArray(release.tags)
    ? release.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];
  const wordCount = richTextToPlainText(release.body ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: release.title,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/release/${release.slug}`,
    datePublished: release.published_at ?? undefined,
    dateModified: release.updated_at,
    inLanguage: 'en',
    wordCount,
    about: tags.map((tag) => ({ '@type': 'Thing', name: tag })),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.release-summary', '.release-headline'],
    },
    isAccessibleForFree: true,
    mentions: release.brand
      ? {
          '@type': 'Organization',
          name: release.brand.name,
          url: release.brand.website ?? undefined,
          logo: release.brand.logo_url ?? undefined,
        }
      : undefined,
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6">
          <h1 className="release-headline text-3xl font-semibold text-neutral-900">
            {release.title}
          </h1>
          {release.brand ? (
            <p className="mt-2 text-sm text-neutral-600">
              {release.brand.name} · Published{' '}
              {release.published_at ? new Date(release.published_at).toLocaleDateString() : '—'}
            </p>
          ) : null}
          {release.summary ? (
            <p className="release-summary mt-4 text-base text-neutral-800">
              {release.summary}
            </p>
          ) : null}
        </div>

        <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <RichTextRender html={release.body} className="bb-richtext" />
        </article>
      </div>
    </main>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const slug = params['release-slug'];
  const release = await loadPublicRelease(slug);
  if (release?.embargo_until && new Date(release.embargo_until) > new Date()) {
    return { robots: 'noindex' } as any;
  }
  return {} as any;
}
