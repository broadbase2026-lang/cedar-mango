/** Formats we skip — browser canvas cannot decode or should not re-encode these. */
const SKIP_COMPRESS_TYPES = new Set([
  'image/svg+xml',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
  'image/bmp',
]);

const SKIP_COMPRESS_EXT = /\.(svg|gif|heic|heif|avif|tiff?|bmp)$/i;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read image.'));
    };
    reader.onerror = () => reject(new Error('Failed to read image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = url;
  });
}

function shouldCompressInBrowser(file: File): boolean {
  const t = file.type.toLowerCase();
  if (SKIP_COMPRESS_EXT.test(file.name)) return false;
  if (!t.startsWith('image/')) return false;
  if (SKIP_COMPRESS_TYPES.has(t)) return false;
  return true;
}

/**
 * Resize and JPEG-compress raster images in the browser. Unsupported or
 * undecodable formats are returned unchanged. On any processing error, returns
 * the original file so upload can still proceed.
 */
export async function compressImageForUpload(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<File> {
  if (!shouldCompressInBrowser(file)) {
    return file;
  }

  const maxEdge = options?.maxEdge ?? 2048;
  const quality = options?.quality ?? 0.82;

  try {
    // data: URLs work under production CSP (img-src allows data:); blob: may be blocked.
    const dataUrl = await readFileAsDataUrl(file);
    const img = await loadImage(dataUrl);
    const { naturalWidth: width, naturalHeight: height } = img;
    if (!width || !height) return file;

    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
