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

const PAYABLE_OR = 'trial_mode.eq.true,status.in.(active,trialing,past_due)';

function isSchemaMismatchError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    msg.includes('does not exist') ||
    msg.includes('trial_mode') ||
    msg.includes('trial_releases_used') ||
    msg.includes('releases_published_this_period')
  );
}

function normalizePayableRow(row: Record<string, unknown> | undefined): PayableSubscriptionRow | null {
  if (!row) return null;
  const plan = row.plan;
  const status = row.status;
  if (typeof plan !== 'string' || typeof status !== 'string') return null;
  if (plan !== 'starter' && plan !== 'pro' && plan !== 'agency') return null;

  return {
    plan,
    status,
    trial_mode: typeof row.trial_mode === 'boolean' ? row.trial_mode : null,
    trial_releases_used:
      typeof row.trial_releases_used === 'number' ? row.trial_releases_used : 0,
    releases_published_this_period:
      typeof row.releases_published_this_period === 'number'
        ? row.releases_published_this_period
        : 0,
  };
}

type PayableQueryMode = 'full_or' | 'status_only' | 'owner_only';

async function queryPayableSubscription(
  admin: SupabaseClient,
  ownerId: string,
  select: string,
  mode: PayableQueryMode
) {
  let query = admin.from('subscriptions').select(select).eq('owner_id', ownerId);

  if (mode === 'full_or') {
    query = query.or(PAYABLE_OR);
  } else if (mode === 'status_only') {
    query = query.in('status', ['active', 'trialing', 'past_due']);
  }

  return query.order('updated_at', { ascending: false }).limit(1);
}

/** Latest subscription row that can upload/publish (trial or paid). Never throws. */
export async function findPayableSubscription(
  admin: SupabaseClient,
  ownerId: string
): Promise<PayableSubscriptionRow | null> {
  const attempts: Array<{ select: string; mode: PayableQueryMode }> = [
    {
      select: 'plan, status, trial_mode, trial_releases_used, releases_published_this_period',
      mode: 'full_or',
    },
    {
      select: 'plan, status, trial_mode, trial_releases_used',
      mode: 'full_or',
    },
    {
      select: 'plan, status, trial_releases_used',
      mode: 'status_only',
    },
    { select: 'plan, status', mode: 'status_only' },
    { select: 'plan, status, trial_mode, trial_releases_used', mode: 'owner_only' },
    { select: 'plan, status', mode: 'owner_only' },
  ];

  for (const attempt of attempts) {
    const { data, error } = await queryPayableSubscription(
      admin,
      ownerId,
      attempt.select,
      attempt.mode
    );

    if (!error) {
      const row = normalizePayableRow(
        (data?.[0] ?? undefined) as unknown as Record<string, unknown> | undefined
      );
      if (row) return row;
      continue;
    }

    if (!isSchemaMismatchError(error)) {
      console.error('[findPayableSubscription] query failed', error);
      return null;
    }
  }

  return null;
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

  const fullInsert = {
    owner_id: ownerId,
    stripe_customer_id: placeholderCustomerId,
    plan: 'starter' as const,
    status: 'trialing' as const,
    trial_mode: true,
    trial_releases_used: 0,
  };

  let { error: insErr } = await admin.from('subscriptions').insert(fullInsert);

  if (insErr && isSchemaMismatchError(insErr)) {
    ({ error: insErr } = await admin.from('subscriptions').insert({
      owner_id: ownerId,
      stripe_customer_id: placeholderCustomerId,
      plan: 'starter',
      status: 'trialing',
    }));
  }

  if (insErr) {
    console.error('[ensureTrialSubscriptionForOwner] insert failed', insErr);
  }

  return findPayableSubscription(admin, ownerId);
}
