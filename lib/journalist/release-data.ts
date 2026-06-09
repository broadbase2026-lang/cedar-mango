import type { SupabaseClient } from '@supabase/supabase-js';

export type JournalistReleaseAsset = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  is_hero: boolean;
  created_at: string;
};

export type BrandRecentRelease = {
  id: string;
  title: string;
  slug: string;
  published_at: string | null;
};

export type JournalistReleaseDetail = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  published_at: string | null;
  industry_vertical: string | null;
  tags: string[];
  brand: { id: string; name: string; slug: string; logo_url: string | null; website: string | null } | null;
  brandRecentReleases: BrandRecentRelease[];
  assets: JournalistReleaseAsset[];
  saved_folder_ids: string[];
};

export async function loadJournalistReleaseBySlug(input: {
  supabase: SupabaseClient;
  journalistId: string;
  slug: string;
}): Promise<JournalistReleaseDetail | null> {
  const { supabase, journalistId, slug } = input;

  const { data: pr } = await supabase
    .from('press_releases')
    .select('id, title, slug, summary, body, published_at, industry_vertical, tags, brand_id')
    .eq('slug', slug)
    .maybeSingle();

  if (!pr) return null;

  const nowIso = new Date().toISOString();

  const [{ data: brand }, { data: assets }, { data: saves }, { data: brandRecentRows }] =
    await Promise.all([
    pr.brand_id
      ? supabase
          .from('brands')
          .select('id, name, slug, logo_url, website')
          .eq('id', pr.brand_id)
          .is('deleted_at', null)
          .maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabase
      .from('press_assets')
      .select('id, file_name, file_url, file_type, caption, is_hero, created_at')
      .eq('press_release_id', pr.id)
      .is('deleted_at', null)
      .order('is_hero', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('journalist_folder_releases')
      .select('folder_id')
      .eq('journalist_id', journalistId)
      .eq('press_release_id', pr.id)
      .limit(500),
    pr.brand_id
      ? supabase
          .from('press_releases')
          .select('id, title, slug, published_at')
          .eq('brand_id', pr.brand_id)
          .eq('status', 'published')
          .is('deleted_at', null)
          .neq('id', pr.id)
          .or(`embargo_until.is.null,embargo_until.lte.${nowIso}`)
          .order('published_at', { ascending: false, nullsFirst: false })
          .limit(5)
      : Promise.resolve({ data: [] } as any),
  ]);

  return {
    id: pr.id,
    title: pr.title,
    slug: pr.slug,
    summary: pr.summary ?? null,
    body: pr.body,
    published_at: pr.published_at ?? null,
    industry_vertical: pr.industry_vertical ?? null,
    tags: (pr.tags ?? []) as string[],
    brand: brand
      ? {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          logo_url: brand.logo_url ?? null,
          website: brand.website ?? null,
        }
      : null,
    brandRecentReleases: ((brandRecentRows ?? []) as Array<{
      id: string;
      title: string;
      slug: string;
      published_at: string | null;
    }>).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      published_at: row.published_at ?? null,
    })),
    assets: (assets ?? []) as JournalistReleaseAsset[],
    saved_folder_ids: (saves ?? []).map((s) => s.folder_id),
  };
}

