import { richTextToPlainText } from '@/lib/rich-text/sanitize';

function normalizeTitleText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Remove a leading heading/paragraph that duplicates the release title.
 * Imported bodies often repeat the headline as an h1/h2 before the real copy.
 */
export function stripLeadingTitleFromHtml(html: string, title: string): string {
  const normalizedTitle = normalizeTitleText(title);
  if (!html || !normalizedTitle) return html ?? '';

  let out = html;
  // Drop empty leading paragraphs/breaks so the title check sees real content.
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/^\s*(?:<(?:p|div)(?:\s[^>]*)?>\s*(?:<br\s*\/?\s*>)?\s*<\/(?:p|div)>|<br\s*\/?\s*>)+\s*/i, '');
    if (next === out) break;
    out = next;
  }

  const leadingBlock = out.match(/^\s*<(h[1-3]|p)(\s[^>]*)?>([\s\S]*?)<\/\1>/i);
  if (!leadingBlock) return out;

  const innerText = normalizeTitleText(richTextToPlainText(leadingBlock[3] ?? ''));
  if (innerText !== normalizedTitle) return out;

  return out.slice(leadingBlock[0].length).replace(/^\s+/, '');
}
