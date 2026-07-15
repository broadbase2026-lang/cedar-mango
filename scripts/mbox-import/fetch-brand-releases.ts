import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;

export type PressReleaseRow = {
  id: string;
  title: string;
  deleted_at: string | null;
};

/** Paginate through all press releases (Supabase caps at 1000 rows per request). */
export async function fetchAllPressReleases(
  admin: SupabaseClient,
  options: { brandId?: string | null } = {}
): Promise<PressReleaseRow[]> {
  const rows: PressReleaseRow[] = [];
  let offset = 0;

  while (true) {
    let query = admin
      .from('press_releases')
      .select('id, title, deleted_at')
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (options.brandId) {
      query = query.eq('brand_id', options.brandId);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`press_releases read: ${error.message}`);
    }
    if (!data?.length) break;

    for (const row of data) {
      rows.push({
        id: String(row.id),
        title: typeof row.title === 'string' ? row.title : '',
        deleted_at:
          typeof row.deleted_at === 'string' ? row.deleted_at : null,
      });
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}
