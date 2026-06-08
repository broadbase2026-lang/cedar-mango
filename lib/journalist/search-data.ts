import type { SupabaseClient } from '@supabase/supabase-js';

export type SearchResultRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  published_at: string | null;
  brand: { id: string; name: string; slug: string } | null;
  saved_folder_ids: string[];
};

export type JournalistSearchData = {
  results: SearchResultRow[];
};

export async function loadJournalistSearchData(input: {
  supabase: SupabaseClient;
  journalistId: string;
  q: string;
  vertical: string | null;
}): Promise<JournalistSearchData> {
  const { supabase, journalistId, q, vertical } = input;

  let query = supabase
    .from('press_releases')
    .select('id, title, slug, summary, published_at, brand_id, industry_vertical')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(50);

  if (q.trim()) {
    // Uses GIN on `fts` (see 006_search_and_triggers.sql). If `fts` is null for some rows,
    // they simply won't match.
    query = query.textSearch('fts', q.trim(), {
      type: 'websearch',
      config: 'english',
    });
  }

  if (vertical && vertical !== 'all') {
    query = query.eq('industry_vertical', vertical);
  }

  const { data: raw } = await query;
  const rows = raw ?? [];

  const brandIds = Array.from(new Set(rows.map((r) => r.brand_id).filter(Boolean))) as string[];
  const brandMap = new Map<string, { id: string; name: string; slug: string }>();
  if (brandIds.length > 0) {
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name, slug')
      .in('id', brandIds)
      .is('deleted_at', null);
    for (const b of brands ?? []) {
      brandMap.set(b.id, { id: b.id, name: b.name, slug: b.slug });
    }
  }

  const releaseIds = rows.map((r) => r.id);
  const savedFolderIdsByReleaseId = new Map<string, string[]>();
  if (releaseIds.length > 0) {
    const { data: savedRows } = await supabase
      .from('journalist_folder_releases')
      .select('press_release_id, folder_id')
      .eq('journalist_id', journalistId)
      .in('press_release_id', releaseIds)
      .limit(2000);
    for (const row of savedRows ?? []) {
      if (!row.press_release_id || !row.folder_id) continue;
      const cur = savedFolderIdsByReleaseId.get(row.press_release_id) ?? [];
      if (!cur.includes(row.folder_id)) cur.push(row.folder_id);
      savedFolderIdsByReleaseId.set(row.press_release_id, cur);
    }
  }

  const results: SearchResultRow[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    summary: r.summary ?? null,
    published_at: r.published_at ?? null,
    brand: r.brand_id ? brandMap.get(r.brand_id) ?? null : null,
    saved_folder_ids: savedFolderIdsByReleaseId.get(r.id) ?? [],
  }));

  return { results };
}

