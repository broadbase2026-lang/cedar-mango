import type { SupabaseClient } from '@supabase/supabase-js';
import type { PressReleaseMock } from '@/lib/journalist/mockData';

export type DiscoverReleaseAssetRow = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  is_hero: boolean;
};

export type DiscoverReleaseRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  published_at: string | null;
  industry_vertical: string | null;
  brand: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  } | null;
  hero_image_url: string | null;
  assets: DiscoverReleaseAssetRow[];
  saved: boolean;
  saved_folder_ids: string[];
};

export type FollowedBrandRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  industry_vertical: string | null;
  followed_at: string;
};

export type FolderRow = {
  id: string;
  name: string;
  updated_at: string;
  saved_count: number;
};

export type SavedReleaseRow = {
  folder_id: string;
  folder_name: string;
  saved_at: string;
  press_release: {
    id: string;
    title: string;
    slug: string;
    published_at: string | null;
    brand: {
      name: string;
      slug: string;
      logo_url: string | null;
    } | null;
  } | null;
};

export type JournalistDiscoverData = {
  recentReleases: DiscoverReleaseRow[];
  followedBrands: FollowedBrandRow[];
  folders: FolderRow[];
  savedReleases: SavedReleaseRow[];
};

function toCountMap(rows: { folder_id: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    m.set(r.folder_id, (m.get(r.folder_id) ?? 0) + 1);
  }
  return m;
}

export async function loadJournalistDiscoverData(
  supabase: SupabaseClient,
  journalistId: string
): Promise<JournalistDiscoverData> {
  const [
    recentRes,
    followsRes,
    foldersRes,
    savesRes,
    saveIdsRes,
  ] = await Promise.all([
    supabase
      .from('press_releases')
      .select('id, title, slug, summary, body, published_at, industry_vertical, brand_id')
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(20),
    supabase
      .from('journalist_follows')
      .select('brand_id, created_at, brands(id, name, slug, logo_url, industry_vertical)')
      .eq('journalist_id', journalistId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('journalist_folders')
      .select('id, name, updated_at')
      .eq('journalist_id', journalistId)
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('journalist_folder_releases')
      .select(
        'folder_id, saved_at, journalist_folders(name), press_releases(id, title, slug, published_at, brands(name, slug, logo_url))'
      )
      .eq('journalist_id', journalistId)
      .order('saved_at', { ascending: false })
      .limit(12),
    supabase
      .from('journalist_folder_releases')
      .select('press_release_id')
      .eq('journalist_id', journalistId)
      .order('saved_at', { ascending: false })
      .limit(200),
  ]);

  const recentRaw = recentRes.data ?? [];
  const recentReleaseIds = recentRaw.map((r) => r.id);

  const heroMap = new Map<string, string>();
  const assetsByReleaseId = new Map<string, DiscoverReleaseAssetRow[]>();
  if (recentReleaseIds.length > 0) {
    const { data: assetRows } = await supabase
      .from('press_assets')
      .select('id, press_release_id, file_name, file_url, file_type, is_hero')
      .in('press_release_id', recentReleaseIds)
      .is('deleted_at', null)
      .order('is_hero', { ascending: false })
      .order('created_at', { ascending: true });

    for (const row of assetRows ?? []) {
      if (!row.press_release_id || !row.file_url) continue;

      const asset: DiscoverReleaseAssetRow = {
        id: row.id,
        file_name: row.file_name,
        file_url: row.file_url,
        file_type: row.file_type,
        is_hero: Boolean(row.is_hero),
      };

      const list = assetsByReleaseId.get(row.press_release_id) ?? [];
      list.push(asset);
      assetsByReleaseId.set(row.press_release_id, list);

      if (!heroMap.has(row.press_release_id)) {
        if (row.is_hero || row.file_type === 'image') {
          heroMap.set(row.press_release_id, row.file_url);
        }
      }
    }

    for (const releaseId of recentReleaseIds) {
      if (heroMap.has(releaseId)) continue;
      const first = assetsByReleaseId.get(releaseId)?.[0];
      if (first?.file_url) heroMap.set(releaseId, first.file_url);
    }
  }

  const brandIds = Array.from(new Set(recentRaw.map((r) => r.brand_id).filter(Boolean))) as string[];
  const brandMap = new Map<string, { id: string; name: string; slug: string; logo_url: string | null }>();
  if (brandIds.length > 0) {
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name, slug, logo_url')
      .in('id', brandIds)
      .is('deleted_at', null);
    for (const b of brands ?? []) {
      brandMap.set(b.id, { id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url });
    }
  }

  const savedReleaseIds = new Set(
    (saveIdsRes.data ?? []).map((r) => r.press_release_id).filter(Boolean) as string[]
  );

  const savedFolderIdsByReleaseId = new Map<string, string[]>();
  if (recentReleaseIds.length > 0) {
    const { data: savedRows } = await supabase
      .from('journalist_folder_releases')
      .select('press_release_id, folder_id')
      .eq('journalist_id', journalistId)
      .in('press_release_id', recentReleaseIds)
      .limit(500);
    for (const row of savedRows ?? []) {
      if (!row.press_release_id || !row.folder_id) continue;
      const current = savedFolderIdsByReleaseId.get(row.press_release_id) ?? [];
      if (!current.includes(row.folder_id)) current.push(row.folder_id);
      savedFolderIdsByReleaseId.set(row.press_release_id, current);
    }
  }

  const recentReleases: DiscoverReleaseRow[] = recentRaw.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary ?? null,
    body: r.body ?? null,
    published_at: r.published_at ?? null,
    industry_vertical: r.industry_vertical ?? null,
    brand: r.brand_id ? brandMap.get(r.brand_id) ?? null : null,
    hero_image_url: heroMap.get(r.id) ?? null,
    assets: assetsByReleaseId.get(r.id) ?? [],
    saved: savedReleaseIds.has(r.id),
    saved_folder_ids: savedFolderIdsByReleaseId.get(r.id) ?? [],
  }));

  const followedBrands: FollowedBrandRow[] = (followsRes.data ?? [])
    .map((row) => {
      const b = row.brands as any;
      if (!b) return null;
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        logo_url: b.logo_url ?? null,
        industry_vertical: b.industry_vertical ?? null,
        followed_at: row.created_at,
      } satisfies FollowedBrandRow;
    })
    .filter((x): x is FollowedBrandRow => Boolean(x));

  const folderCounts = toCountMap(
    (savesRes.data ?? [])
      .map((s) => ({ folder_id: s.folder_id }))
      .filter((x): x is { folder_id: string } => Boolean(x.folder_id))
  );

  const folders: FolderRow[] = (foldersRes.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    updated_at: f.updated_at,
    saved_count: folderCounts.get(f.id) ?? 0,
  }));

  const savedReleases: SavedReleaseRow[] = (savesRes.data ?? []).map((s) => {
    const folderName = (s.journalist_folders as any)?.name ?? 'Folder';
    const pr = s.press_releases as any;
    const brand = pr?.brands ?? null;
    return {
      folder_id: s.folder_id,
      folder_name: folderName,
      saved_at: s.saved_at,
      press_release: pr
        ? {
            id: pr.id,
            title: pr.title,
            slug: pr.slug,
            published_at: pr.published_at ?? null,
            brand: brand
              ? { name: brand.name, slug: brand.slug, logo_url: brand.logo_url ?? null }
              : null,
          }
        : null,
    };
  });

  return { recentReleases, followedBrands, folders, savedReleases };
}

const VERTICAL_MAP: Record<string, 'F&B' | 'Travel' | 'Culture'> = {
  fnb: 'F&B',
  travel: 'Travel',
  culture: 'Culture',
  fashion: 'Culture',
  lifestyle: 'Culture',
  other: 'Culture',
};

function imageCropFromId(id: string): 'small' | 'medium' | 'large' {
  const n = id.charCodeAt(0) % 3;
  if (n === 0) return 'small';
  if (n === 1) return 'medium';
  return 'large';
}

/** Map DB rows to the discover feed card shape (fallback fields for UI-only scoring). */
export function mapDiscoverRowsToFeed(rows: DiscoverReleaseRow[]): PressReleaseMock[] {
  return rows.map((row) => {
    const verticalKey = (row.industry_vertical ?? 'other').toLowerCase();
    const vertical = VERTICAL_MAP[verticalKey] ?? 'Culture';
    const beats: Array<'Culture' | 'F&B' | 'Travel'> =
      vertical === 'F&B'
        ? ['F&B']
        : vertical === 'Travel'
          ? ['Travel']
          : ['Culture'];

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      vertical,
      region: 'APAC',
      beats,
      heroImageUrl:
        row.hero_image_url ??
        `https://picsum.photos/seed/${encodeURIComponent(row.id)}/1200/1400`,
      summary: row.summary ?? '',
      body: row.body?.trim() ? row.body : (row.summary ?? ''),
      publishedAt: row.published_at ?? new Date().toISOString(),
      engagement: { pastReads: 0, pastSaves: row.saved ? 1 : 0 },
      mediaAssets: row.assets.map((a) => ({
        label: a.file_name,
        href: a.file_url,
      })),
      imageCrop: imageCropFromId(row.id),
    };
  });
}

