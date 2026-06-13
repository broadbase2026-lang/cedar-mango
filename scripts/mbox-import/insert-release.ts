import type { SupabaseClient } from '@supabase/supabase-js';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';
import type { BuiltRelease } from './build-release';

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function insertDraftRelease(
  admin: SupabaseClient,
  brandId: string,
  release: BuiltRelease
): Promise<string> {
  const bodyPlain = richTextToPlainText(release.body).trim();
  if (!release.title.trim() || !bodyPlain) {
    throw new Error('Release title/body empty after build.');
  }

  const base = slugify(release.title) || 'release';
  const slug = `${base}-${uniqueSuffix()}`;

  const { data, error } = await admin
    .from('press_releases')
    .insert({
      brand_id: brandId,
      title: release.title,
      slug,
      body: release.body,
      summary: release.summary,
      industry_vertical: release.industry_vertical,
      tags: release.tags,
      status: 'draft',
    })
    .select('id')
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(`press_releases insert failed: ${error?.message ?? 'unknown'}`);
  }

  return data.id;
}
