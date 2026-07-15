import type { SupabaseClient } from '@supabase/supabase-js';

export const ASSETS_PAGE_SIZE = 50;

export type MediaReleaseOption = {
  id: string;
  title: string;
  status: string;
};

export type MediaAssetRow = {
  id: string;
  press_release_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number | null;
  caption: string | null;
  is_hero: boolean;
  is_public: boolean;
  created_at: string;
  release_title: string | null;
  release_status: string | null;
};

export type MediaLibraryPayload = {
  assets: MediaAssetRow[];
  releases: MediaReleaseOption[];
  assetsPagination: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export async function loadMediaLibraryData(
  supabase: SupabaseClient,
  brandId: string,
  options?: { page?: number }
): Promise<MediaLibraryPayload> {
  const page = Math.max(1, options?.page ?? 1);
  const from = (page - 1) * ASSETS_PAGE_SIZE;
  const to = from + ASSETS_PAGE_SIZE - 1;

  const [assetsRes, countRes, releasesRes] = await Promise.all([
    supabase
      .from('press_assets')
      .select(
        'id, press_release_id, file_name, file_url, file_type, file_size_bytes, caption, is_hero, is_public, created_at'
      )
      .eq('brand_id', brandId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to),
    supabase
      .from('press_assets')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .is('deleted_at', null),
    supabase
      .from('press_releases')
      .select('id, title, status')
      .eq('brand_id', brandId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  if (releasesRes.error) {
    console.error('[loadMediaLibraryData] releases query failed', releasesRes.error);
  }
  if (assetsRes.error) {
    console.error('[loadMediaLibraryData] assets query failed', assetsRes.error);
  }
  if (countRes.error) {
    console.error('[loadMediaLibraryData] assets count failed', countRes.error);
  }

  const assetsRaw = assetsRes.error ? [] : (assetsRes.data ?? []);
  const releases = releasesRes.error
    ? []
    : ((releasesRes.data ?? []) as MediaReleaseOption[]);
  const releaseMap = new Map(releases.map((r) => [r.id, r]));
  const total = countRes.error ? assetsRaw.length : (countRes.count ?? 0);

  const assets: MediaAssetRow[] = assetsRaw.map((a) => {
    const rid = a.press_release_id;
    const pr = rid ? releaseMap.get(rid) : undefined;
    return {
      id: a.id,
      press_release_id: a.press_release_id,
      file_name: a.file_name,
      file_url: a.file_url,
      file_type: a.file_type,
      file_size_bytes: a.file_size_bytes,
      caption: a.caption,
      is_hero: a.is_hero,
      is_public: a.is_public,
      created_at: a.created_at,
      release_title: pr?.title ?? null,
      release_status: pr?.status ?? null,
    };
  });

  return {
    assets,
    releases,
    assetsPagination: {
      page,
      pageSize: ASSETS_PAGE_SIZE,
      total,
    },
  };
}
