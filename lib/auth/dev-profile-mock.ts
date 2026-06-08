import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionPlan } from '@/types';

// DEV ONLY MOCK — start
/** Temporary override while subscription/profile sync is fixed. Delete this file when done. */
const DEV_MOCK_ENTERPRISE_USER_ID = 'a28c4072-a264-416c-87cc-95693b5359bb';

function devMockEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function isDevEnterpriseMockUser(userId: string): boolean {
  if (!devMockEnabled()) return false;
  return userId === DEV_MOCK_ENTERPRISE_USER_ID;
}

/** Maps to `profiles.user_type` (supply-side / brand portal). */
export function applyDevProfileOverrides<T extends { user_type?: string | null }>(
  userId: string,
  profile: T | null
): T | null {
  if (!isDevEnterpriseMockUser(userId)) {
    return profile;
  }
  return {
    ...(profile ?? {}),
    user_type: 'brand',
  } as T;
}

/** Enterprise tier in product copy; stored as `agency` on subscriptions. */
export function applyDevSubscriptionOverrides<
  T extends {
    plan?: string | null;
    status?: string | null;
    trial_mode?: boolean | null;
  },
>(userId: string, subscription: T | null): T | null {
  if (!isDevEnterpriseMockUser(userId)) {
    return subscription;
  }
  return {
    ...(subscription ?? {}),
    plan: 'agency' satisfies SubscriptionPlan,
    status: 'active',
    trial_mode: false,
  } as T;
}

export function devEnterpriseHasActiveSubscription(userId: string): boolean {
  return isDevEnterpriseMockUser(userId);
}
// DEV ONLY MOCK — end

export type BrandOwnerSubscription = {
  plan: string;
  status: string;
};

/**
 * Load the brand owner's subscription row (active/trialing/past_due first, else latest).
 * Applies DEV ONLY MOCK overrides when configured.
 */
export async function fetchBrandOwnerSubscription(
  supabase: SupabaseClient,
  ownerId: string
): Promise<BrandOwnerSubscription | null> {
  const payableRes = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('owner_id', ownerId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1);

  let row = (payableRes.data?.[0] ?? null) as BrandOwnerSubscription | null;

  if (!row) {
    const { data: latest } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(1);
    row = (latest?.[0] ?? null) as BrandOwnerSubscription | null;
  }

  return applyDevSubscriptionOverrides(ownerId, row);
}

/** Plan used for tier gates when subscription is active or trialing. */
export function brandPlanFromSubscription(
  ownerId: string,
  subscription: BrandOwnerSubscription | null
): SubscriptionPlan | null {
  const sub = applyDevSubscriptionOverrides(ownerId, subscription);
  if (!sub) return null;
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    if (!isDevEnterpriseMockUser(ownerId)) return null;
  }
  const plan = sub.plan;
  if (plan === 'starter' || plan === 'pro' || plan === 'agency') {
    return plan;
  }
  return isDevEnterpriseMockUser(ownerId) ? 'agency' : null;
}
