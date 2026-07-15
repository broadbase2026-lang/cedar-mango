import 'server-only';

import { assertSafeFetchTarget, validateSafeFetchUrl } from '@/lib/safe-fetch-url';
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/constants/uploads';
import { sanitizeFilename } from '@/lib/utils/sanitizeFilename';

const FETCH_TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 5;

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

function extFromMime(mime: string): string | null {
  const base = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  return MIME_TO_EXT[base] ?? null;
}

function filenameFromUrl(url: URL, mime: string): string {
  const last = url.pathname.split('/').filter(Boolean).pop() ?? '';
  const decoded = (() => {
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  })();

  if (decoded && IMAGE_EXT.test(decoded)) {
    return sanitizeFilename(decoded) || 'image.jpg';
  }

  const ext = extFromMime(mime) ?? 'jpg';
  const base = sanitizeFilename(decoded.replace(/\.[^.]+$/, '')) || 'image';
  return `${base}.${ext}`;
}

async function readResponseBytesLimited(
  res: Response,
  maxBytes: number
): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) {
      throw new Error(
        `Image is too large (max ${maxBytes / (1024 * 1024)}MB).`
      );
    }
    return buf;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(
        `Image is too large (max ${maxBytes / (1024 * 1024)}MB).`
      );
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Fetch with manual redirect handling so every hop's hostname is
 * re-validated against the SSRF blocklist.
 */
async function fetchFollowingSafeRedirects(
  startUrl: URL,
  signal: AbortSignal
): Promise<Response> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeFetchTarget(current);

    const res = await fetch(current.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'BroadbasePressImport/1.0 (+https://broadbase.app)',
      },
    });

    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return res;

    const location = res.headers.get('location');
    if (!location) return res;
    current = await validateSafeFetchUrl(new URL(location, current).toString());
  }
  throw new Error('Too many redirects while fetching image.');
}

export type FetchedImageForUpload = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
  sourceUrl: string;
};

/** Fetch a public image URL for press-asset upload (SSRF-safe). */
export async function fetchImageForUpload(
  rawUrl: string
): Promise<FetchedImageForUpload> {
  const url = await validateSafeFetchUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetchFollowingSafeRedirects(url, controller.signal);

    if (!res.ok) {
      throw new Error(`Could not fetch image (HTTP ${res.status}).`);
    }

    const contentTypeRaw = res.headers.get('content-type') ?? '';
    const contentType =
      contentTypeRaw.split(';')[0]?.trim().toLowerCase() || '';

    const contentLength = Number(res.headers.get('content-length') ?? '');
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_IMAGE_UPLOAD_BYTES
    ) {
      throw new Error(
        `Image is too large (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB).`
      );
    }

    const bytes = await readResponseBytesLimited(res, MAX_IMAGE_UPLOAD_BYTES);
    if (bytes.byteLength === 0) {
      throw new Error('Image URL returned empty content.');
    }

    const pathLooksLikeImage = IMAGE_EXT.test(url.pathname);
    const isOpaqueBinary =
      !contentType ||
      contentType === 'application/octet-stream' ||
      contentType === 'binary/octet-stream';

    if (contentType === 'image/svg+xml') {
      throw new Error('SVG images cannot be uploaded from a URL.');
    }
    if (contentType.startsWith('image/')) {
      // OK
    } else if (isOpaqueBinary && pathLooksLikeImage) {
      // OK — some CDNs omit a useful Content-Type
    } else {
      throw new Error('URL must point to an image file.');
    }

    let resolvedMime = contentType.startsWith('image/')
      ? contentType
      : 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      const fromPath = url.pathname.toLowerCase();
      if (fromPath.endsWith('.png')) resolvedMime = 'image/png';
      else if (fromPath.endsWith('.webp')) resolvedMime = 'image/webp';
      else if (fromPath.endsWith('.gif')) resolvedMime = 'image/gif';
      else if (fromPath.endsWith('.avif')) resolvedMime = 'image/avif';
      else if (/\.jpe?g$/.test(fromPath)) resolvedMime = 'image/jpeg';
    }

    return {
      bytes,
      contentType: resolvedMime,
      fileName: filenameFromUrl(url, resolvedMime),
      sourceUrl: url.toString(),
    };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Timed out fetching image. Try again or use a faster host.');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
