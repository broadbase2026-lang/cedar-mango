import sanitizeHtml from 'sanitize-html';

const DEFAULT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'a',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'span',
];

export function sanitizeRichTextHtml(input: string): string {
  return sanitizeHtml(input ?? '', {
    allowedTags: DEFAULT_ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['style'],
      p: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,8}$/i, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
        'font-size': [/^\d+(\.\d+)?(px|rem|em|%)$/],
        'font-weight': [/^\d{3}$/ , /^bold$/],
        'font-style': [/^italic$/],
        'text-decoration': [/^underline$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noreferrer noopener',
        target: '_blank',
      }),
    },
  });
}

export function richTextToPlainText(html: string): string {
  // Strip everything and return only text content.
  return sanitizeHtml(html ?? '', { allowedTags: [], allowedAttributes: {} }).trim();
}

