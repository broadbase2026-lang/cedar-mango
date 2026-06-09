import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MAX_IMAGES_PER_PRESS_RELEASE,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_TRIAL_IMAGES_PER_PRESS_RELEASE,
} from '@/lib/constants/uploads';

export type PendingReleaseAsset = {
  path: string;
  publicUrl: string;
  fileName: string;
  fileSizeBytes: number;
};

export function parsePendingReleaseAssets(
  raw: string,
  brandId: string,
  maxImages: number
): PendingReleaseAsset[] | 'invalid' {
  const t = raw.trim();
  if (!t) return [];

  try {
    const j = JSON.parse(t) as unknown;
    if (!Array.isArray(j)) return 'invalid';
    if (j.length > maxImages) return 'invalid';

    const out: PendingReleaseAsset[] = [];
    for (const item of j) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const path = typeof o.path === 'string' ? o.path.trim() : '';
      const publicUrl = typeof o.publicUrl === 'string' ? o.publicUrl.trim() : '';
      const fileName = typeof o.fileName === 'string' ? o.fileName.trim() : '';
      const fileSizeBytes =
        typeof o.fileSizeBytes === 'number' && Number.isFinite(o.fileSizeBytes)
          ? Math.round(o.fileSizeBytes)
          : 0;
      if (!path || !publicUrl || !fileName) continue;
      const prefix = `${brandId}/`;
      if (!path.startsWith(prefix) || path.includes('..')) continue;
      if (fileSizeBytes > MAX_IMAGE_UPLOAD_BYTES) return 'invalid';
      out.push({ path, publicUrl, fileName, fileSizeBytes });
      if (out.length > maxImages) return 'invalid';
    }
    return out;
  } catch {
    return 'invalid';
  }
}

/** Insert uploaded images into press_assets for a release (skips URLs already linked). */
export async function attachPendingAssetsToRelease(
  admin: SupabaseClient,
  brandId: string,
  releaseId: string,
  pendingAssets: PendingReleaseAsset[]
): Promise<{ error: string | null }> {
  if (pendingAssets.length === 0) {
    return { error: null };
  }

  const { data: existing, error: readErr } = await admin
    .from('press_assets')
    .select('file_url')
    .eq('brand_id', brandId)
    .eq('press_release_id', releaseId)
    .eq('file_type', 'image')
    .is('deleted_at', null);

  if (readErr) {
    return { error: readErr.message };
  }

  const linked = new Set(
    (existing ?? [])
      .map((row) => (typeof row.file_url === 'string' ? row.file_url : ''))
      .filter(Boolean)
  );

  const toInsert = pendingAssets.filter((a) => !linked.has(a.publicUrl));
  if (toInsert.length === 0) {
    return { error: null };
  }

  const rows = toInsert.map((a) => ({
    brand_id: brandId,
    press_release_id: releaseId,
    file_name: a.fileName,
    file_url: a.publicUrl,
    file_type: 'image' as const,
    file_size_bytes: a.fileSizeBytes || null,
    caption: null as string | null,
    is_public: true,
    is_hero: false,
  }));

  const { error: insertErr } = await admin.from('press_assets').insert(rows);
  if (insertErr) {
    return { error: insertErr.message };
  }

  return { error: null };
}

export function maxImagesForTrial(isTrial: boolean): number {
  return isTrial
    ? MAX_TRIAL_IMAGES_PER_PRESS_RELEASE
    : MAX_IMAGES_PER_PRESS_RELEASE;
}
