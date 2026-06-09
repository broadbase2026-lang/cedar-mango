import type { SupabaseClient } from '@supabase/supabase-js';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export const BRAND_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Derive a unique brand newsroom slug from the workspace name. */
export async function generateUniqueBrandSlug(
  supabase: SupabaseClient,
  name: string,
  ownerId: string
): Promise<string> {
  const base = slugify(name) || `brand-${ownerId.slice(0, 8)}`;
  const fallback = `brand-${ownerId.slice(0, 8)}`;
  const seed = BRAND_SLUG_RE.test(base) ? base : fallback;

  let candidate = seed;
  for (let attempt = 0; attempt < 25; attempt++) {
    const { data } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', candidate)
      .is('deleted_at', null)
      .maybeSingle();

    if (!data) return candidate;

    candidate =
      attempt === 0 ? `${seed}-${ownerId.slice(0, 6)}` : `${seed}-${attempt + 1}`;
  }

  return `${seed}-${crypto.randomUUID().slice(0, 8)}`;
}
