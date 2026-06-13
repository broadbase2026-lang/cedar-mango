import type { SupabaseClient } from '@supabase/supabase-js';
import { generateUniqueBrandSlug } from '@/lib/utils/generateSlug';
import type { ImportManifest } from './manifest';
import {
  migrationUserEmail,
  parseSender,
  type ParsedSender,
} from './parse-sender';

export type ResolvedBrand = {
  brandId: string;
  ownerId: string;
  displayName: string;
  domain: string;
  created: boolean;
};

async function findBrandByWebsite(
  admin: SupabaseClient,
  domain: string
): Promise<{ id: string; owner_id: string; name: string } | null> {
  const website = `https://${domain}`;
  const { data } = await admin
    .from('brands')
    .select('id, owner_id, name')
    .eq('website', website)
    .is('deleted_at', null)
    .maybeSingle();
  return data ?? null;
}

async function findStubUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const found = data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  return found?.id ?? null;
}

async function createStubBrandOwner(
  admin: SupabaseClient,
  sender: ParsedSender
): Promise<string> {
  const email = migrationUserEmail(sender.domain);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      user_type: 'brand',
      full_name: sender.displayName,
    },
  });

  if (!error && data.user?.id) {
    return data.user.id;
  }

  if (error && /already|exists|registered/i.test(error.message)) {
    const existingId = await findStubUserByEmail(admin, email);
    if (existingId) return existingId;
  }

  throw new Error(
    `Failed to create stub user for ${sender.domain}: ${error?.message ?? 'unknown'}`
  );
}

async function ensureAgencySubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<void> {
  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('owner_id', ownerId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existing?.id) return;

  const customerId = `migration_${crypto.randomUUID()}`;
  const { error } = await admin.from('subscriptions').insert({
    owner_id: ownerId,
    stripe_customer_id: customerId,
    plan: 'agency',
    status: 'active',
    trial_mode: false,
  });

  if (error) {
    // trial_mode column may be absent on older schemas — retry without it.
    const { error: retryErr } = await admin.from('subscriptions').insert({
      owner_id: ownerId,
      stripe_customer_id: customerId,
      plan: 'agency',
      status: 'active',
    });
    if (retryErr) {
      throw new Error(`Failed to create subscription for ${ownerId}: ${retryErr.message}`);
    }
  }
}

export async function resolveBrandForSender(input: {
  admin: SupabaseClient | null;
  fromRaw: string | null;
  manifest: ImportManifest;
  dryRun: boolean;
}): Promise<ResolvedBrand | null> {
  const sender = parseSender(input.fromRaw);
  if (!sender) return null;

  const cached = input.manifest.domains[sender.domain];
  if (cached) {
    return {
      brandId: cached.brandId,
      ownerId: cached.ownerId,
      displayName: cached.displayName,
      domain: sender.domain,
      created: false,
    };
  }

  const existingBrand = input.admin
    ? await findBrandByWebsite(input.admin, sender.domain)
    : null;
  if (existingBrand) {
    input.manifest.domains[sender.domain] = {
      brandId: existingBrand.id,
      ownerId: existingBrand.owner_id,
      displayName: existingBrand.name,
    };
    return {
      brandId: existingBrand.id,
      ownerId: existingBrand.owner_id,
      displayName: existingBrand.name,
      domain: sender.domain,
      created: false,
    };
  }

  if (input.dryRun) {
    return {
      brandId: `dry-run-brand-${sender.domain}`,
      ownerId: `dry-run-owner-${sender.domain}`,
      displayName: sender.displayName,
      domain: sender.domain,
      created: true,
    };
  }

  if (!input.admin) {
    throw new Error('Supabase admin client required for brand creation.');
  }

  const ownerId = await createStubBrandOwner(input.admin, sender);
  await ensureAgencySubscription(input.admin, ownerId);

  const slug = await generateUniqueBrandSlug(input.admin, sender.displayName, ownerId);
  const { data: brand, error } = await input.admin
    .from('brands')
    .insert({
      owner_id: ownerId,
      name: sender.displayName,
      slug,
      website: `https://${sender.domain}`,
    })
    .select('id')
    .maybeSingle();

  if (error || !brand?.id) {
    throw new Error(
      `Failed to create brand for ${sender.domain}: ${error?.message ?? 'unknown'}`
    );
  }

  input.manifest.domains[sender.domain] = {
    brandId: brand.id,
    ownerId,
    displayName: sender.displayName,
  };

  return {
    brandId: brand.id,
    ownerId,
    displayName: sender.displayName,
    domain: sender.domain,
    created: true,
  };
}
