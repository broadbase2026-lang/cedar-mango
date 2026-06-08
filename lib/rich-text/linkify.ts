/**
 * Very small "linkify" helper for rich-text HTML.
 *
 * Goal: turn plain URLs / emails inside text nodes into <a> links while leaving
 * existing tags intact (and not linkifying inside attributes).
 *
 * This is intentionally conservative and does not aim to be a full HTML parser.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeUrl(raw: string): { href: string; label: string } {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return { href: trimmed, label: trimmed };
  }
  // www.example.com → https://www.example.com
  return { href: `https://${trimmed}`, label: trimmed };
}

/**
 * Replaces plain URLs and emails in a string (no HTML tags) with <a> links.
 */
function linkifyText(text: string): string {
  // Emails first (avoid capturing trailing punctuation).
  const emailRe =
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?![^<]*>)/g;

  // URLs: https://… or http://… or www.…; avoid trailing punctuation.
  const urlRe =
    /\b((?:https?:\/\/|www\.)[^\s<]+?)(?=[\s<]|$)/gi;

  // Work on escaped text so we never introduce raw HTML from the source.
  let out = escapeHtml(text);

  // Linkify emails.
  out = out.replace(emailRe, (m) => {
    const href = `mailto:${m}`;
    return `<a href="${href}">${m}</a>`;
  });

  // Linkify URLs (post-email so mailto: isn't reprocessed).
  out = out.replace(urlRe, (m) => {
    const cleaned = m.replace(/[)\].,;:!?]+$/g, (trail) => trail); // keep for label; href below will be trimmed
    const trimmedHref = m.replace(/[)\].,;:!?]+$/g, '');
    const { href } = normalizeUrl(trimmedHref);
    const label = cleaned;
    return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
  });

  return out;
}

/**
 * Linkifies only text outside of tags.
 */
export function linkifyRichTextHtml(html: string): string {
  const s = String(html ?? '');
  if (!s) return '';

  let out = '';
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt === -1) {
      out += linkifyText(s.slice(i));
      break;
    }
    if (lt > i) {
      out += linkifyText(s.slice(i, lt));
    }
    const gt = s.indexOf('>', lt);
    if (gt === -1) {
      // malformed HTML; treat rest as text
      out += linkifyText(s.slice(lt));
      break;
    }
    // Copy tag as-is.
    out += s.slice(lt, gt + 1);
    i = gt + 1;
  }

  return out;
}

