import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ensureTrialSubscriptionForOwner,
  findPayableSubscription,
} from '@/lib/auth/ensure-trial-subscription';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { isBetaTrialOnly } from '@/lib/config/beta';
import type { SubscriptionPlan } from '@/types';

export type UploadSubscriptionGate =
  | { ok: true; plan: SubscriptionPlan }
  | { ok: false; error: string };

function planFromRow(
  sub: { plan?: string | null; status?: string | null; trial_mode?: boolean | null }
): SubscriptionPlan | null {
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

async function brandOwnerHasWorkspace(
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

/**
 * Resolve whether a brand owner may upload press assets and which plan caps apply.
 * Trial workspaces (trial_mode or trialing) may upload for their first press release.
 */
export async function resolveUploadSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<UploadSubscriptionGate> {
  try {
    let row = await findPayableSubscription(admin, ownerId);

    if (!row) {
      row = await ensureTrialSubscriptionForOwner(admin, ownerId);
    }

    const sub = applyDevSubscriptionOverrides(ownerId, row);
    if (sub) {
      const trialMode = Boolean(sub.trial_mode);
      const status = sub.status;
      const canUpload =
        trialMode ||
        status === 'active' ||
        status === 'trialing' ||
        status === 'past_due';

      if (canUpload) {
        const plan = planFromRow(sub);
        if (plan) {
          return { ok: true, plan };
        }
      }
    }

    // Staged beta: brand owners with a workspace can upload on the free-trial path
    // even if subscription provisioning failed (e.g. missing migration).
    if (isBetaTrialOnly && (await brandOwnerHasWorkspace(admin, ownerId))) {
      return { ok: true, plan: 'starter' };
    }

    return {
      ok: false,
      error: 'You need an active subscription to upload assets.',
    };
  } catch (err) {
    console.error('[resolveUploadSubscription] failed', err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : 'Subscription check failed.',
    };
  }
}
