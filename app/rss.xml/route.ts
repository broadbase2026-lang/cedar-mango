import { createAdminClient } from '@/lib/supabase/admin';
import {
  PUBLIC_RELEASE_SELECT,
  mapReleaseRows,
  type PublicRelease,
} from '@/lib/api/public-releases';
import { RSS_FEED } from '@/constants/copy';

export const revalidate = 3600;

const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';
const CONTENT_TYPE = 'application/rss+xml; charset=utf-8';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) ? parsed.toUTCString() : null;
}

function renderItem(release: PublicRelease, baseUrl: string): string {
  const link = `${baseUrl}/release/${release.slug}`;
  const pubDate = toRfc822(release.published_at);

  const categories: string[] = [];
  if (release.industry_vertical) {
    categories.push(release.industry_vertical);
  }
  for (const tag of release.tags) {
    categories.push(tag);
  }

  const parts: string[] = [
    '    <item>',
    `      <title>${escapeXml(release.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <description>${escapeXml(release.summary ?? '')}</description>`,
  ];

  if (pubDate) {
    parts.push(`      <pubDate>${pubDate}</pubDate>`);
  }

  parts.push(`      <guid isPermaLink="true">${escapeXml(link)}</guid>`);

  for (const category of categories) {
    parts.push(`      <category>${escapeXml(category)}</category>`);
  }

  if (release.hero_image_url) {
    parts.push(
      `      <enclosure url="${escapeXml(release.hero_image_url)}" type="image/jpeg" length="0"/>`,
    );
  }

  parts.push('    </item>');
  return parts.join('\n');
}

function renderFeed(items: string, lastBuildDate: string, baseUrl: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(RSS_FEED.title)}</title>`,
    `    <link>${escapeXml(baseUrl)}</link>`,
    `    <description>${escapeXml(RSS_FEED.description)}</description>`,
    `    <language>${RSS_FEED.language}</language>`,
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${baseUrl}/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

export async function GET(): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { data, error } = await admin
      .from('press_releases')
      .select(PUBLIC_RELEASE_SELECT)
      .eq('status', 'published')
      .is('deleted_at', null)
      .or(`embargo_until.is.null,embargo_until.lte.${nowIso}`)
      .in('moderation_status', ['pending', 'approved'])
      .eq('press_assets.is_hero', true)
      .is('press_assets.deleted_at', null)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) throw error;

    const releases = mapReleaseRows(data);
    const lastBuildDate =
      toRfc822(releases[0]?.published_at ?? null) ?? new Date().toUTCString();
    const items = releases
      .map((release) => renderItem(release, baseUrl))
      .join('\n');

    return new Response(renderFeed(items, lastBuildDate, baseUrl), {
      status: 200,
      headers: { 'Content-Type': CONTENT_TYPE, 'Cache-Control': CACHE_CONTROL },
    });
  } catch (err) {
    console.error('[rss.xml] failed to build feed:', err);
    return new Response(
      renderFeed('', new Date().toUTCString(), baseUrl),
      {
        status: 200,
        headers: { 'Content-Type': CONTENT_TYPE, 'Cache-Control': CACHE_CONTROL },
      },
    );
  }
}
