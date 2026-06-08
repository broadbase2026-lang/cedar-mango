import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

type PageProps = {
  params: { 'brand-slug': string };
};

export const revalidate = 60;

export default async function NewsroomPage({ params }: PageProps) {
  const slug = params['brand-slug'];
  const admin = createAdminClient();

  const { data: brand } = await admin
    .from('brands')
    .select('id, name, slug, logo_url, website, description')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (!brand?.id) {
    return (
      <main className="min-h-screen bg-white p-8">
        <h1 className="text-xl font-semibold">Newsroom not found</h1>
      </main>
    );
  }

  const nowIso = new Date().toISOString();
  const { data: releases } = await admin
    .from('press_releases')
    .select('id, title, slug, summary, published_at, embargo_until')
    .eq('brand_id', brand.id)
    .eq('status', 'published')
    .is('deleted_at', null)
    .or(`embargo_until.is.null,embargo_until.lte.${nowIso}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(50);

  // Defensive: this should never include active embargo rows given the query filter.
  if ((releases ?? []).some((r) => r.embargo_until && new Date(r.embargo_until) > new Date())) {
    noStore();
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-neutral-900">{brand.name}</h1>
          {brand.description ? (
            <p className="mt-2 text-neutral-700">{brand.description}</p>
          ) : null}
          {brand.website ? (
            <a
              className="mt-3 inline-block text-sm font-medium text-brand-primary-700 hover:underline"
              href={brand.website}
              target="_blank"
              rel="noreferrer"
            >
              {brand.website}
            </a>
          ) : null}
        </div>

        <section className="space-y-4">
          {(releases ?? []).length === 0 ? (
            <p className="text-neutral-600">No published releases yet.</p>
          ) : (
            (releases ?? []).map((r) => (
              <article
                key={r.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-lg text-neutral-900">
                  <Link href={`/release/${r.slug}`} className="hover:underline">
                    {r.title}
                  </Link>
                </h2>
                {r.summary ? (
                  <p className="mt-2 text-sm text-neutral-700">{r.summary}</p>
                ) : null}
                <p className="mt-3 text-xs text-neutral-500">
                  {r.published_at ? new Date(r.published_at).toLocaleString() : '—'}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
