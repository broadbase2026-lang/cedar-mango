function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = url;
  });
}

/**
 * Resize and JPEG-compress raster images in the browser. SVG and GIF are returned unchanged.
 */
export async function compressImageForUpload(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<File> {
  const maxEdge = options?.maxEdge ?? 2048;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith('image/')) {
    return file;
  }
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
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
  } finally {
    URL.revokeObjectURL(url);
  }
}
