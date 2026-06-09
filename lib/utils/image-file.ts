const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i;

/** Detect raster images when the browser omits MIME type (common on drag-and-drop). */
export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return IMAGE_EXT.test(file.name);
}
