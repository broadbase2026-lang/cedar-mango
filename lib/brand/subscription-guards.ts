import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureTrialSubscriptionForOwner,
  findPayableSubscription,
  type PayableSubscriptionRow,
} from '@/lib/auth/ensure-trial-subscription';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { isBetaTrialOnly } from '@/lib/config/beta';
import type { SubscriptionPlan } from '@/types';

export function planFromRow(sub: {
  plan?: string | null;
  status?: string | null;
  trial_mode?: boolean | null;
}): SubscriptionPlan | null {
  const trialMode = Boolean(sub.trial_mode);
  const status = sub.status;
  const planRaw = sub.plan as SubscriptionPlan | null | undefined;
  const plan =
    planRaw ??
    (trialMode || status === 'trialing' || status === 'past_due'
      ? ('starter' as const)
      : undefined);

  if (plan === 'starter' || plan === 'pro' || plan === 'agency') {
    return plan;
  }
  return null;
}

export async function brandOwnerHasWorkspace(
  admin: SupabaseClient,
  ownerId: string
): Promise<boolean> {
  const { data: profile } = await admin
    .from('profiles')
    .select('user_type')
    .eq('id', ownerId)
    .maybeSingle();

  if (profile?.user_type !== 'brand') return false;

  const { data: brand } = await admin
    .from('brands')
    .select('id')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle();

  return Boolean(brand);
}

export type ResolvedPayableSubscription = {
  trialMode: boolean;
  releasesUsed: number;
  plan: SubscriptionPlan;
  releasesPublishedThisPeriod: number;
};

/** Load the trial/payable subscription row used for upload and publish gates. */
export async function resolvePayableSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<ResolvedPayableSubscription | null> {
  let row: PayableSubscriptionRow | null = await findPayableSubscription(
    admin,
    ownerId
  );

  if (!row) {
    row = await ensureTrialSubscriptionForOwner(admin, ownerId);
  }

  const sub = applyDevSubscriptionOverrides(ownerId, row);
  if (sub) {
    const trialMode = Boolean(sub.trial_mode);
    const status = sub.status;
    const canUse =
      trialMode ||
      status === 'active' ||
      status === 'trialing' ||
      status === 'past_due';

    const plan = planFromRow(sub);
    if (canUse && plan) {
      return {
        trialMode,
        releasesUsed:
          typeof sub.trial_releases_used === 'number'
            ? sub.trial_releases_used
            : 0,
        plan,
        releasesPublishedThisPeriod:
          typeof sub.releases_published_this_period === 'number'
            ? sub.releases_published_this_period
            : 0,
      };
    }
  }

  if (isBetaTrialOnly && (await brandOwnerHasWorkspace(admin, ownerId))) {
    return {
      trialMode: true,
      releasesUsed: 0,
      plan: 'starter',
      releasesPublishedThisPeriod: 0,
    };
  }

  return null;
}
