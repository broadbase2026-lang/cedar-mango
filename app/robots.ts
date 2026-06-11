import type { MetadataRoute } from 'next';

const ALLOW: string[] = [
  '/',
  '/release/*',
  '/newsroom/*',
  '/rss.xml',
  '/sitemap.xml',
  '/llms.txt',
  '/api/v1/*',
];

const DISALLOW: string[] = [
  '/(auth)/*',
  '/(brand)/*',
  '/(journalist)/*',
  '/api/webhooks/*',
  '/api/digest',
  '/api/download',
  '/api/ai',
  '/api/journalist/*',
];

const LLM_CRAWLERS: string[] = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Amazonbot',
  'YouBot',
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ALLOW,
        disallow: DISALLOW,
      },
      ...LLM_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: ALLOW,
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
  };
}
