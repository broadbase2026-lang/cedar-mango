import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 3600;

type ReleaseRow = {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
};

type BrandRow = {
  slug: string;
  updated_at: string | null;
};

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? '';
}

function staticEntries(): MetadataRoute.Sitemap {
  return [
    {
      url: `${baseUrl()}/`,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    const [releasesRes, brandsRes] = await Promise.all([
      admin
        .from('press_releases')
        .select('slug, updated_at, published_at')
        .eq('status', 'published')
        .is('deleted_at', null)
        .or(`embargo_until.is.null,embargo_until.lte.${nowIso}`)
        .in('moderation_status', ['pending', 'approved']),
      admin
        .from('brands')
        .select('slug, updated_at')
        .is('deleted_at', null)
        .eq('verified', true),
    ]);

    if (releasesRes.error) throw releasesRes.error;
    if (brandsRes.error) throw brandsRes.error;

    const releases: ReleaseRow[] = releasesRes.data ?? [];
    const brands: BrandRow[] = brandsRes.data ?? [];

    const releaseEntries: MetadataRoute.Sitemap = releases.map((release) => ({
      url: `${base}/release/${release.slug}`,
      lastModified: release.updated_at ?? undefined,
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

    const newsroomEntries: MetadataRoute.Sitemap = brands.map((brand) => ({
      url: `${base}/newsroom/${brand.slug}`,
      lastModified: brand.updated_at ?? undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticEntries(), ...releaseEntries, ...newsroomEntries];
  } catch (error) {
    console.error('[sitemap] failed to build dynamic entries:', error);
    return staticEntries();
  }
}
