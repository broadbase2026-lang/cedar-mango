/**
 * Remove embedded images and data-URI blobs from HTML used in release import.
 * Inline DOCX images become multi-megabyte base64 <img> tags via mammoth; the
 * model may copy them into bodyHtml and blow past body length limits.
 */
export function stripEmbeddedMediaFromHtml(html: string): string {
  if (!html) return '';

  let out = html;

  out = out.replace(/<img\b[^>]*>/gi, '');
  out = out.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, '');
  out = out.replace(/<source\b[^>]*>/gi, '');
  out = out.replace(/<video\b[^>]*>[\s\S]*?<\/video>/gi, '');
  out = out.replace(
    /\s(?:src|href|xlink:href)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi,
    ''
  );
  out = out.replace(/data:image\/[a-z0-9+.-]+;base64,[a-z0-9+/=\s]+/gi, '');

  return out;
}
