import { sanitizeRichTextHtml } from '@/lib/rich-text/sanitize';

type Props = {
  html: string;
  className?: string;
};

export function RichTextRender({ html, className }: Props) {
  const safe = sanitizeRichTextHtml(html);
  return (
    <div
      className={className ?? 'bb-richtext'}
      // Sanitized on the server to prevent XSS.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

