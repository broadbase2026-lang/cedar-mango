import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPlan } from '@/types';

export type PayableSubscriptionRow = {
  plan: SubscriptionPlan;
  status: string;
  trial_mode: boolean | null;
  trial_releases_used?: number | null;
  releases_published_this_period?: number | null;
};

const PAYABLE_FILTER = 'trial_mode.eq.true,status.in.(active,trialing,past_due)';

/** Latest subscription row that can upload/publish (trial or paid). */
export async function findPayableSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<PayableSubscriptionRow | null> {
  const { data, error } = await admin
    .from('subscriptions')
    .select('plan, status, trial_mode, trial_releases_used, releases_published_this_period')
    .eq('owner_id', ownerId)
    .or(PAYABLE_FILTER)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  const row = data?.[0];
  if (!row?.plan || !row?.status) return null;
  return row as PayableSubscriptionRow;
}

/**
 * Ensure a brand owner has a trial/payable subscription row (idempotent).
 * Creates a placeholder trial row when the owner has a brand but no payable subscription.
 */
export async function ensureTrialSubscriptionForOwner(
  admin: SupabaseClient,
  ownerId: string
): Promise<PayableSubscriptionRow | null> {
  const existing = await findPayableSubscription(admin, ownerId);
  if (existing) return existing;

  const { data: profile } = await admin
    .from('profiles')
    .select('user_type')
    .eq('id', ownerId)
    .maybeSingle();

  if (profile?.user_type !== 'brand') return null;

  const { data: brand } = await admin
    .from('brands')
    .select('id')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (!brand) return null;

  const placeholderCustomerId = `trial_${crypto.randomUUID()}`;
  const { error: insErr } = await admin.from('subscriptions').insert({
    owner_id: ownerId,
    stripe_customer_id: placeholderCustomerId,
    plan: 'starter',
    status: 'trialing',
    trial_mode: true,
    trial_releases_used: 0,
  });

  if (insErr) {
    console.error('[ensureTrialSubscriptionForOwner] insert failed', insErr);
    return findPayableSubscription(admin, ownerId);
  }

  return findPayableSubscription(admin, ownerId);
}
