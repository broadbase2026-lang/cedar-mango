import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { RichTextRender } from '@/components/rich-text/rich-text-render';

type PageProps = {
  params: { 'release-slug': string };
};

export const revalidate = 60;

async function loadPublicRelease(slug: string) {
  const admin = createAdminClient();
  const { data: pr } = await admin
    .from('press_releases')
    .select(
      'id, title, slug, summary, body, published_at, embargo_until, brand_id, moderation_status'
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

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-neutral-900">{release.title}</h1>
          {release.brand ? (
            <p className="mt-2 text-sm text-neutral-600">
              {release.brand.name} · Published{' '}
              {release.published_at ? new Date(release.published_at).toLocaleDateString() : '—'}
            </p>
          ) : null}
          {release.summary ? (
            <p className="mt-4 text-base text-neutral-800">{release.summary}</p>
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
