const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

function decodeOnce(input: string): string {
  let s = input;

  s = s.replace(/&#x([0-9a-f]{1,6});/gi, (_, hex) => {
    const cp = parseInt(hex, 16);
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return _;
    try {
      return String.fromCodePoint(cp);
    } catch {
      return _;
    }
  });

  s = s.replace(/&#(\d{1,7});/g, (_, num) => {
    const cp = parseInt(num, 10);
    if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return _;
    try {
      return String.fromCodePoint(cp);
    } catch {
      return _;
    }
  });

  s = s.replace(/&([a-z]+);/gi, (full, name: string) => {
    const key = name.toLowerCase();
    return NAMED_ENTITIES[key] ?? full;
  });

  return s;
}

/**
 * Decodes HTML character references (named, decimal, hex). Runs repeatedly so
 * double-encoded sequences like `&amp;lt;` become `<`. Safe for typical rich-text
 * fragments from imports; avoid using on untrusted raw HTML from arbitrary sources
 * without sanitization afterward.
 */
export function decodeHtmlCharacterReferences(input: string): string {
  let prev = '';
  let s = input;
  let guard = 0;
  while (s !== prev && guard++ < 12) {
    prev = s;
    s = decodeOnce(s);
  }
  return s;
}
