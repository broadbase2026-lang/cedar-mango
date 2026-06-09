export type ReleaseImageAsset = {
  /** Set when loaded from or saved to press_assets. */
  id?: string;
  path: string;
  publicUrl: string;
  fileName: string;
  fileSizeBytes: number;
};

/** Recover the storage object path from a Supabase public URL. */
export function storagePathFromPublicUrl(
  publicUrl: string,
  brandId: string
): string {
  try {
    const u = new URL(publicUrl);
    const marker = '/press-assets-public/';
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) {
      return decodeURIComponent(u.pathname.slice(idx + marker.length));
    }
  } catch {
    // fall through
  }
  return `${brandId}/linked-asset`;
}

export function releaseImageFromRow(row: {
  id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
}): ReleaseImageAsset {
  const publicUrl = row.file_url;
  const brandPrefix = publicUrl.match(/\/press-assets-public\/([^/]+)\//);
  const brandId = brandPrefix?.[1] ?? 'unknown';
  return {
    id: row.id,
    path: storagePathFromPublicUrl(publicUrl, brandId),
    publicUrl,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes ?? 0,
  };
}
