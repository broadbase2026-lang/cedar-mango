import { createAdminClient } from '@/lib/supabase/admin';

export const ARCHIVE_PAGE_SIZE = 20;

export type ArchiveReleaseRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  published_at: string | null;
  industry_vertical: string | null;
  brand_id: string | null;
  brand_name: string | null;
  brand_slug: string | null;
};

export type ArchiveQuery = {
  q?: string;
  vertical?: string;
  page?: number;
  pageSize?: number;
};

export type ArchiveResult = {
  releases: ArchiveReleaseRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type BrandEmbed = { name: string; slug: string } | null;

type RawRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  published_at: string | null;
  industry_vertical: string | null;
  brand_id: string | null;
  brands: BrandEmbed | BrandEmbed[] | null;
};

function mapBrand(brands: RawRow['brands']): {
  brand_name: string | null;
  brand_slug: string | null;
} {
  const brand = Array.isArray(brands) ? brands[0] ?? null : brands;
  return {
    brand_name: brand?.name ?? null,
    brand_slug: brand?.slug ?? null,
  };
}

export async function loadArchiveReleases(
  query: ArchiveQuery = {},
): Promise<ArchiveResult> {
  const pageSize = query.pageSize ?? ARCHIVE_PAGE_SIZE;
  const page = Math.max(1, query.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const nowIso = new Date().toISOString();
  const q = query.q?.trim() ?? '';

  const admin = createAdminClient();

  let builder = admin
    .from('press_releases')
    .select(
      'id, title, slug, summary, published_at, industry_vertical, brand_id, brands!inner(name, slug)',
      { count: 'exact' },
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .or(`embargo_until.is.null,embargo_until.lte.${nowIso}`)
    .in('moderation_status', ['pending', 'approved'])
    .is('brands.deleted_at', null);

  if (query.vertical) {
    builder = builder.eq('industry_vertical', query.vertical);
  }

  if (q) {
    builder = builder.textSearch('fts', q, {
      type: 'websearch',
      config: 'english',
    });
  }

  const { data, count, error } = await builder
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    console.error('[archive] loadArchiveReleases failed:', error.message);
    return {
      releases: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const total = count ?? 0;
  const releases: ArchiveReleaseRow[] = ((data ?? []) as RawRow[]).map(
    (row) => {
      const brand = mapBrand(row.brands);
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        published_at: row.published_at,
        industry_vertical: row.industry_vertical,
        brand_id: row.brand_id,
        brand_name: brand.brand_name,
        brand_slug: brand.brand_slug,
      };
    },
  );

  return {
    releases,
    total,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
