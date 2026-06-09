import 'server-only';

import { ensureTrialSubscriptionForOwner } from '@/lib/auth/ensure-trial-subscription';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Creates brand workspace + trial subscription row for a new brand owner (idempotent). */
export async function provisionTrialBrandForUser(
  ownerId: string,
  fullName: string | null | undefined
): Promise<void> {
  const supabase = await createClient();

  const { data: existingBrand } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (!existingBrand) {
    const baseName = fullName?.trim() || 'New Brand';
    const slugBase = slugify(baseName) || `brand-${ownerId.slice(0, 8)}`;
    const slug = `${slugBase}-${ownerId.slice(0, 6)}`;

    await supabase.from('brands').insert({
      owner_id: ownerId,
      name: baseName,
      slug,
    });
  }

  try {
    const admin = createAdminClient();
    await ensureTrialSubscriptionForOwner(admin, ownerId);
  } catch (err) {
    console.error('[provisionTrialBrandForUser] ensure trial subscription failed', err);
  }
}
