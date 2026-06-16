import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { ResolvedBrand } from './resolve-brand';

/** Paginated auth user lookup (no server-only dependency). */
export async function resolveAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers failed: ${error.message}`);
    }

    const match = data.users.find(
      (u) => u.email?.trim().toLowerCase() === normalized
    );
    if (match) return match;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function resolvePublisherBrand(input: {
  admin: SupabaseClient | null;
  publisherEmail: string;
  dryRun: boolean;
}): Promise<ResolvedBrand> {
  const email = input.publisherEmail.trim().toLowerCase();
  if (!email) {
    throw new Error('Publisher email is empty.');
  }

  if (input.dryRun && !input.admin) {
    return {
      brandId: `dry-run-publisher-brand`,
      ownerId: `dry-run-publisher-owner`,
      displayName: email,
      domain: 'publisher',
      created: false,
    };
  }

  if (!input.admin) {
    throw new Error('Supabase admin client required to resolve publisher brand.');
  }

  const user = await resolveAuthUserByEmail(input.admin, email);
  if (!user?.id) {
    throw new Error(`No auth user found for publisher email: ${email}`);
  }

  const { data: profile } = await input.admin
    .from('profiles')
    .select('user_type, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.user_type !== 'brand') {
    throw new Error(`Publisher ${email} is not a brand account (user_type=${profile?.user_type ?? 'missing'}).`);
  }

  const { data: brand } = await input.admin
    .from('brands')
    .select('id, name, owner_id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!brand?.id) {
    throw new Error(`No brand workspace found for publisher ${email}.`);
  }

  return {
    brandId: brand.id,
    ownerId: user.id,
    displayName: brand.name,
    domain: 'publisher',
    created: false,
  };
}
