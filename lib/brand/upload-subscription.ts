import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import type { SubscriptionPlan } from '@/types';

export type UploadSubscriptionGate =
  | { ok: true; plan: SubscriptionPlan }
  | { ok: false; error: string };

/**
 * Resolve whether a brand owner may upload press assets and which plan caps apply.
 * Aligns with publish/trial flows: trial_mode workspaces may upload even when status
 * is only present on a placeholder row.
 */
export async function resolveUploadSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<UploadSubscriptionGate> {
  const { data: rows, error } = await admin
    .from('subscriptions')
    .select('plan, status, trial_mode')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    return { ok: false, error: error.message };
  }

  const sub = applyDevSubscriptionOverrides(ownerId, rows?.[0] ?? null);
  if (!sub) {
    return {
      ok: false,
      error: 'You need an active subscription to upload assets.',
    };
  }

  const trialMode = Boolean(sub.trial_mode);
  const status = sub.status;
  const canUpload =
    trialMode ||
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due';

  if (!canUpload) {
    return {
      ok: false,
      error: 'You need an active subscription to upload assets.',
    };
  }

  const planRaw = sub.plan as SubscriptionPlan | null | undefined;
  const plan =
    planRaw ??
    (trialMode || status === 'trialing' || status === 'past_due'
      ? ('starter' as const)
      : undefined);

  if (!plan || (plan !== 'starter' && plan !== 'pro' && plan !== 'agency')) {
    return {
      ok: false,
      error: 'You need an active subscription to upload assets.',
    };
  }

  return { ok: true, plan };
}
