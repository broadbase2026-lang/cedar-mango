import { sanitizeLegalHtml } from '@/lib/legal/sanitize';

type LegalDocumentProps = {
  html: string;
};

export function LegalDocument({ html }: LegalDocumentProps) {
  const sanitized = sanitizeLegalHtml(html);

  return (
    <article
      className="legal-prose"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
