import type { MetadataRoute } from 'next';
import { appBaseUrl } from '@/lib/seo/app-base-url';

const ALLOW: string[] = [
  '/',
  '/release/*',
  '/releases',
  '/releases/*',
  '/newsroom/*',
  '/pricing',
  '/geo',
  '/rss.xml',
  '/sitemap.xml',
  '/llms.txt',
  '/ai.txt',
  '/api/v1/*',
];

const DISALLOW: string[] = [
  '/brand/',
  '/login',
  '/signup',
  '/journalist/discover',
  '/journalist/folders',
  '/journalist/search',
  '/journalist/settings',
  '/journalist/feedback',
  '/journalist/release/',
  '/portfolio',
  '/settings/portfolio',
  '/api/webhooks/',
  '/api/digest',
  '/api/download',
  '/api/ai',
  '/api/journalist/',
];

const LLM_CRAWLERS: string[] = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'PerplexityBot',
  'Bytespider',
  'anthropic-ai',
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
    sitemap: `${appBaseUrl()}/sitemap.xml`,
  };
}
