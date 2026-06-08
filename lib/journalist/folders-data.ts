import type { SupabaseClient } from '@supabase/supabase-js';

export type FolderListRow = {
  id: string;
  name: string;
  updated_at: string;
  saved_count: number;
};

export type FolderDetailRow = {
  id: string;
  name: string;
  updated_at: string;
  items: {
    press_release_id: string;
    saved_at: string;
    title: string;
    slug: string;
    published_at: string | null;
    brand_name: string | null;
    brand_slug: string | null;
  }[];
};

export async function loadFolderList(input: {
  supabase: SupabaseClient;
  journalistId: string;
}): Promise<FolderListRow[]> {
  const { supabase, journalistId } = input;

  const [{ data: folders }, { data: saves }] = await Promise.all([
    supabase
      .from('journalist_folders')
      .select('id, name, updated_at')
      .eq('journalist_id', journalistId)
      .order('updated_at', { ascending: false })
      .limit(50),
    supabase
      .from('journalist_folder_releases')
      .select('folder_id')
      .eq('journalist_id', journalistId)
      .limit(5000),
  ]);

  const countMap = new Map<string, number>();
  for (const row of saves ?? []) {
    countMap.set(row.folder_id, (countMap.get(row.folder_id) ?? 0) + 1);
  }

  return (folders ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    updated_at: f.updated_at,
    saved_count: countMap.get(f.id) ?? 0,
  }));
}

export async function loadFolderDetail(input: {
  supabase: SupabaseClient;
  journalistId: string;
  folderId: string;
}): Promise<FolderDetailRow | null> {
  const { supabase, journalistId, folderId } = input;

  const folderRes = await supabase
    .from('journalist_folders')
    .select('id, name, updated_at')
    .eq('id', folderId)
    .eq('journalist_id', journalistId)
    .maybeSingle();

  if (!folderRes.data) return null;

  const { data: itemsRaw } = await supabase
    .from('journalist_folder_releases')
    .select(
      'press_release_id, saved_at, press_releases(title, slug, published_at, brands(name, slug))'
    )
    .eq('journalist_id', journalistId)
    .eq('folder_id', folderId)
    .order('saved_at', { ascending: false })
    .limit(200);

  const items =
    (itemsRaw ?? []).map((r) => {
      const pr = r.press_releases as any;
      const b = pr?.brands ?? null;
      return {
        press_release_id: r.press_release_id,
        saved_at: r.saved_at,
        title: pr?.title ?? 'Untitled',
        slug: pr?.slug ?? '',
        published_at: pr?.published_at ?? null,
        brand_name: b?.name ?? null,
        brand_slug: b?.slug ?? null,
      };
    }) ?? [];

  return {
    id: folderRes.data.id,
    name: folderRes.data.name,
    updated_at: folderRes.data.updated_at,
    items,
  };
}

