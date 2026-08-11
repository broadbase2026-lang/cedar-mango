import type { SupabaseClient } from '@supabase/supabase-js';

export type JournalistReleaseAsset = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  is_hero: boolean;
  created_at: string;
  /** Set when the journalist has a private-bucket invitation for this asset. */
  privateDownload?: {
    embargoUntil: string | null;
  } | null;
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

async function loadAssetInvitationsForJournalist(input: {
  supabase: SupabaseClient;
  journalistId: string;
  journalistEmail: string | null | undefined;
  assetIds: string[];
}): Promise<Map<string, { embargoUntil: string | null }>> {
  const { supabase, journalistId, journalistEmail, assetIds } = input;
  const out = new Map<string, { embargoUntil: string | null }>();

  if (assetIds.length === 0) return out;

  const base = () =>
    supabase
      .from('asset_invitations')
      .select('asset_id, embargo_until')
      .in('asset_id', assetIds)
      .is('revoked_at', null);

  const byUser = await base().eq('invited_user_id', journalistId);
  for (const row of byUser.data ?? []) {
    out.set(row.asset_id, { embargoUntil: row.embargo_until ?? null });
  }

  if (journalistEmail) {
    const byEmail = await base().eq('invited_email', journalistEmail);
    for (const row of byEmail.data ?? []) {
      if (!out.has(row.asset_id)) {
        out.set(row.asset_id, { embargoUntil: row.embargo_until ?? null });
      }
    }
  }

  return out;
}

export async function loadJournalistReleaseBySlug(input: {
  supabase: SupabaseClient;
  journalistId: string;
  journalistEmail?: string | null;
  slug: string;
}): Promise<JournalistReleaseDetail | null> {
  const { supabase, journalistId, journalistEmail, slug } = input;

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

  const assetRows = (assets ?? []) as Omit<
    JournalistReleaseAsset,
    'privateDownload'
  >[];
  const invitationByAsset = await loadAssetInvitationsForJournalist({
    supabase,
    journalistId,
    journalistEmail,
    assetIds: assetRows.map((a) => a.id),
  });

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
    assets: assetRows.map((a) => {
      const invitation = invitationByAsset.get(a.id);
      return {
        ...a,
        privateDownload: invitation
          ? { embargoUntil: invitation.embargoUntil }
          : null,
      };
    }),
    saved_folder_ids: (saves ?? []).map((s) => s.folder_id),
  };
}

