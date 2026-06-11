import { LLMS_TXT } from '@/constants/copy';

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const body = LLMS_TXT.template.replaceAll('{NEXT_PUBLIC_APP_URL}', appUrl);

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
