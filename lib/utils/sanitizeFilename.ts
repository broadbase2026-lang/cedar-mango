export function sanitizeFilename(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .slice(0, 200);
}
