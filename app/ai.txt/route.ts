import { LLMS_TXT } from '@/constants/copy';
import { appBaseUrl } from '@/lib/seo/app-base-url';

export const revalidate = 3600;

/**
 * Emerging ai.txt guidance for AI crawlers.
 * Content mirrors llms.txt so agents have a stable alternate discovery URL.
 */
export async function GET(): Promise<Response> {
  const siteUrl = appBaseUrl();
  const llmsBody = LLMS_TXT.template.replaceAll(
    '{NEXT_PUBLIC_APP_URL}',
    siteUrl,
  );

  const body = `# ai.txt — Broadbase
# Guidance for AI systems crawling and citing Broadbase content.
# Canonical machine-readable overview also at ${siteUrl}/llms.txt

${llmsBody}
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
