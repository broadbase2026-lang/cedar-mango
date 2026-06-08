import sanitizeHtml from 'sanitize-html';

const LEGAL_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'a',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'span',
];

export function sanitizeLegalHtml(input: string): string {
  return sanitizeHtml(input ?? '', {
    allowedTags: LEGAL_ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      h2: ['id', 'class'],
      h3: ['id', 'class'],
      span: ['class'],
      table: ['class'],
      th: ['class'],
      td: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noreferrer noopener',
        target: '_blank',
      }),
      table: sanitizeHtml.simpleTransform('table', { class: 'legal-table' }),
    },
  });
}
