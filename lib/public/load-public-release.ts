import { createAdminClient } from '@/lib/supabase/admin';
import {
  pickHeroAsset,
  type PressAssetHeroCandidate,
} from '@/lib/press-assets/pick-hero-asset';

export type PublicReleaseAsset = PressAssetHeroCandidate & {
  id: string;
  caption: string | null;
  is_public: boolean;
};

export type PublicReleaseBrand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
};

export type PublicReleaseRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  published_at: string | null;
  updated_at: string;
  tags: string[] | null;
  industry_vertical: string | null;
  embargo_until: string | null;
  brand_id: string | null;
  moderation_status: string | null;
  brand: PublicReleaseBrand | null;
  press_assets: PublicReleaseAsset[];
};

export async function loadPublicRelease(
  slug: string,
): Promise<PublicReleaseRow | null> {
  const admin = createAdminClient();
  const { data: pr } = await admin
    .from('press_releases')
    .select(
      'id, title, slug, summary, body, published_at, updated_at, tags, industry_vertical, embargo_until, brand_id, moderation_status, press_assets(id, file_url, file_type, caption, is_hero, is_public, deleted_at)',
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

  const assets = (
    Array.isArray(pr.press_assets) ? (pr.press_assets as (PublicReleaseAsset & { deleted_at: string | null })[]) : []
  )
    .filter((a) => !a.deleted_at)
    .map(({ deleted_at: _deletedAt, ...asset }) => asset);

  return {
    ...pr,
    brand: brand ?? null,
    press_assets: assets,
  };
}

export function pickPublicHeroAsset(
  assets: PublicReleaseAsset[],
): PublicReleaseAsset | null {
  const publicAssets = assets.filter((a) => a.is_public);
  return pickHeroAsset(publicAssets);
}

export function isReleaseEmbargoed(
  embargoUntil: string | null | undefined,
  now = new Date(),
): boolean {
  return Boolean(embargoUntil && new Date(embargoUntil) > now);
}
