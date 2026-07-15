import 'server-only';

const BUCKET = 'press-assets-public';

/** Public object URL for a path in the press-assets-public bucket. */
export function pressAssetsPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.');
  }
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}
