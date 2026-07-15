import 'server-only';

import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import {
  ensureTrialSubscriptionForOwner,
  findPayableSubscription,
} from '@/lib/auth/ensure-trial-subscription';
import { planFromRow } from '@/lib/brand/subscription-guards';
import { ERROR_MESSAGES, TIER_FEATURES } from '@/constants/copy';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SubscriptionPlan } from '@/types';

export type BrandAiAccessResult =
  | { ok: true; userId: string; plan: SubscriptionPlan }
  | { ok: false; status: number; error: string };

export type BrandUserAccessResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

async function assertBrandProfile(
  userId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<BrandUserAccessResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.user_type !== 'brand') {
    return { ok: false, status: 403, error: 'Brand accounts only.' };
  }

  return { ok: true, userId };
}

/** Gate brand-only AI helpers (import, summary) — any brand account, any plan. */
export async function assertBrandUserAccess(): Promise<BrandUserAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: 'Not signed in.' };
  }

  return assertBrandProfile(user.id, supabase);
}

/**
 * Gate brand-side Gemini features that require Growth or Enterprise.
 * Resolves the payable subscription row robustly (never uses maybeSingle on history).
 */
export async function assertBrandAiAccess(): Promise<BrandAiAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: 'Not signed in.' };
  }

  const brandCheck = await assertBrandProfile(user.id, supabase);
  if (!brandCheck.ok) {
    return brandCheck;
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, status: 500, error: 'Server misconfigured.' };
  }

  let row = await findPayableSubscription(admin, user.id);
  if (!row) {
    row = await ensureTrialSubscriptionForOwner(admin, user.id);
  }

  const sub = applyDevSubscriptionOverrides(user.id, row);
  const plan = sub ? planFromRow(sub) : null;

  if (!plan) {
    return {
      ok: false,
      status: 403,
      error: 'You need an active subscription to use AI.',
    };
  }

  if (!TIER_FEATURES[plan].aiWritingAssistant) {
    return { ok: false, status: 403, error: ERROR_MESSAGES.aiNotAvailable };
  }

  return { ok: true, userId: user.id, plan };
}
