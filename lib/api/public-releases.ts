import type { SupabaseClient } from '@supabase/supabase-js';

export const RELEASE_VERTICALS = [
  'fnb',
  'travel',
  'culture',
  'fashion',
  'lifestyle',
  'other',
] as const;

export type ReleaseVertical = (typeof RELEASE_VERTICALS)[number];

export type PublicRelease = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  updated_at: string | null;
  industry_vertical: string | null;
  tags: string[];
  ai_readiness_score: number | null;
  geo_readiness_score: number | null;
  brand_name: string | null;
  brand_slug: string | null;
  brand_website: string | null;
  hero_image_url: string | null;
};

// Public, body-free projection. Body text is intentionally excluded from these
// crawl endpoints — it is only served on /release/[slug] pages.
export const PUBLIC_RELEASE_SELECT =
  'slug, title, summary, published_at, updated_at, industry_vertical, tags, ai_readiness_score, geo_readiness_score, brands!inner ( name, slug, website ), press_assets ( file_url )';

type RawReleaseRow = {
  slug: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  updated_at: string | null;
  industry_vertical: string | null;
  tags: string[] | null;
  ai_readiness_score: number | null;
  geo_readiness_score: number | null;
  brands: { name: string; slug: string; website: string | null } | null;
  press_assets: { file_url: string }[] | null;
};

function mapRow(row: RawReleaseRow): PublicRelease {
  const hero = row.press_assets?.[0] ?? null;
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    published_at: row.published_at,
    updated_at: row.updated_at,
    industry_vertical: row.industry_vertical,
    tags: Array.isArray(row.tags) ? row.tags : [],
    ai_readiness_score: row.ai_readiness_score,
    geo_readiness_score: row.geo_readiness_score,
    brand_name: row.brands?.name ?? null,
    brand_slug: row.brands?.slug ?? null,
    brand_website: row.brands?.website ?? null,
    hero_image_url: hero?.file_url ?? null,
  };
}

// Supabase has no generated DB types in this project, so embedded-join results
// are untyped; assert to the known projection shape once, here.
export function mapReleaseRows(data: unknown): PublicRelease[] {
  const rows = (data ?? []) as RawReleaseRow[];
  return rows.map(mapRow);
}

export type AdminSupabase = SupabaseClient;
