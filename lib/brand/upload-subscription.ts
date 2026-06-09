import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePayableSubscription } from '@/lib/brand/subscription-guards';
import type { SubscriptionPlan } from '@/types';

export type UploadSubscriptionGate =
  | { ok: true; plan: SubscriptionPlan }
  | { ok: false; error: string };

/**
 * Resolve whether a brand owner may upload press assets and which plan caps apply.
 * Trial workspaces (trial_mode or trialing) may upload for their first press release.
 */
export async function resolveUploadSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<UploadSubscriptionGate> {
  try {
    const resolved = await resolvePayableSubscription(admin, ownerId);
    if (resolved) {
      return { ok: true, plan: resolved.plan };
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
