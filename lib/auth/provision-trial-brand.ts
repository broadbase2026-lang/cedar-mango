import 'server-only';

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

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (existingSub) return;

  try {
    const admin = createAdminClient();
    const placeholderCustomerId = `trial_${crypto.randomUUID()}`;
    await admin.from('subscriptions').insert({
      owner_id: ownerId,
      stripe_customer_id: placeholderCustomerId,
      plan: 'starter',
      status: 'trialing',
      trial_mode: true,
      trial_releases_used: 0,
    });
  } catch {
    // Duplicate or transient failure — upload guards rely on DB state once present.
  }
}
