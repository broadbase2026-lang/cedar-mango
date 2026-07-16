'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resolvePayableSubscription } from '@/lib/brand/subscription-guards';
import { hasUnlimitedPlanLimits } from '@/lib/auth/unlimited-plan-limits';
import { createAdminClient } from '@/lib/supabase/admin';
import { ERROR_MESSAGES, PLAN_LIMITS, TRIAL_LIMIT_COPY } from '@/constants/copy';

export async function softDeleteRelease(
  releaseId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('press_releases')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', releaseId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/brand/dashboard');
  return { ok: true };
}

export async function publishRelease(
  releaseId: string
  , embargoUntilUtc?: string
): Promise<
  | { ok: true }
  | { ok: false; message: string; redirectTo?: string }
> {
  try {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in.' };
  }

  const releaseRes = await supabase
    .from('press_releases')
    .select('id, status')
    .eq('id', releaseId)
    .is('deleted_at', null)
    .maybeSingle();

  if (releaseRes.error) {
    return { ok: false, message: releaseRes.error.message };
  }
  if (!releaseRes.data) {
    return { ok: false, message: 'Press release not found.' };
  }
  if (releaseRes.data.status !== 'draft') {
    return { ok: false, message: 'Only draft releases can be published.' };
  }

  // Trial enforcement (Option 3): allow exactly 1 published release when trial_mode = true.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, message: 'Server misconfigured.' };
  }

  const subscription = await resolvePayableSubscription(admin, user.id);

  if (!subscription) {
    return { ok: false, message: 'You need an active subscription to publish.' };
  }

  const { trialMode, releasesUsed, plan: subPlan, releasesPublishedThisPeriod } =
    subscription;

  if (trialMode && releasesUsed >= 1) {
    return {
      ok: false,
      message: TRIAL_LIMIT_COPY.errors.releaseLimit,
      redirectTo: '/pricing?reason=release-limit',
    };
  }

  if (embargoUntilUtc && subPlan === 'starter') {
    return { ok: false, message: ERROR_MESSAGES.embargoNotAvailable };
  }

  if (embargoUntilUtc) {
    const embargoAt = new Date(embargoUntilUtc);
    if (!Number.isFinite(embargoAt.getTime()) || embargoAt <= new Date()) {
      return { ok: false, message: ERROR_MESSAGES.embargoDateMustBeFuture };
    }
  }

  const tierLimit = hasUnlimitedPlanLimits(user.id)
    ? null
    : PLAN_LIMITS[subPlan]?.releasesPerPeriod ?? null;
  const publishedThisPeriod = releasesPublishedThisPeriod;

  if (typeof tierLimit === 'number') {
    if (publishedThisPeriod >= tierLimit) {
      return { ok: false, message: ERROR_MESSAGES.publishLimitReached };
    }

    // Fallback: count actual publishes when the subscription counter is missing/out-of-sync.
    const windowStartIso = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const { data: brandRow } = await supabase
      .from('press_releases')
      .select('brand_id')
      .eq('id', releaseId)
      .is('deleted_at', null)
      .maybeSingle();

    if (brandRow?.brand_id) {
      const publishedCountRes = await admin
        .from('press_releases')
        .select('id', { count: 'exact', head: true })
        .eq('brand_id', brandRow.brand_id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .gte('published_at', windowStartIso);

      if (!publishedCountRes.error && (publishedCountRes.count ?? 0) >= tierLimit) {
        return { ok: false, message: ERROR_MESSAGES.publishLimitReached };
      }
    }
  }

  // Gate: must have at least 1 (non-deleted) asset attached.
  const assetsCountRes = await admin
    .from('press_assets')
    .select('id', { count: 'exact', head: true })
    .eq('press_release_id', releaseId)
    .is('deleted_at', null);

  if ((assetsCountRes.count ?? 0) < 1) {
    return {
      ok: false,
      message:
        'Add at least 1 press image on the draft (Press images section) or in Media Library before publishing.',
    };
  }

  // Status change is protected by RLS (brand owner only).
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('press_releases')
    .update({
      status: 'published',
      published_at: now,
      ...(embargoUntilUtc ? { embargo_until: embargoUntilUtc } : null),
      // Keep moderation_status as-is (default is 'pending'); journalists can read pending+approved.
    })
    .eq('id', releaseId)
    .is('deleted_at', null);

  if (error) {
    return { ok: false, message: error.message };
  }

  if (trialMode) {
    const { error: trialCounterErr } = await admin
      .from('subscriptions')
      .update({ trial_releases_used: releasesUsed + 1 })
      .eq('id', subscription.subscriptionId);
    if (trialCounterErr) {
      console.error('[publishRelease] trial_releases_used update', trialCounterErr);
    }
  }

  if (typeof tierLimit === 'number') {
    const { error: periodCounterErr } = await admin
      .from('subscriptions')
      .update({ releases_published_this_period: publishedThisPeriod + 1 })
      .eq('id', subscription.subscriptionId);
    if (periodCounterErr) {
      console.error(
        '[publishRelease] releases_published_this_period update',
        periodCounterErr
      );
    }
  }

  revalidatePath('/brand/dashboard');
  return { ok: true };
  } catch (err) {
    console.error('[publishRelease] unhandled exception', err);
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : 'Publish failed. Try again.',
    };
  }
}

export async function unpublishReleaseToDraft(
  releaseId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('press_releases')
    .update({
      status: 'draft',
      published_at: null,
    })
    .eq('id', releaseId)
    .is('deleted_at', null);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/brand/dashboard');
  return { ok: true };
}

export async function archiveRelease(
  releaseId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('press_releases')
    .update({
      status: 'archived',
    })
    .eq('id', releaseId)
    .is('deleted_at', null);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/brand/dashboard');
  return { ok: true };
}

function uniqueReleaseIds(releaseIds: string[]): string[] {
  return Array.from(new Set(releaseIds.map((id) => id.trim()).filter(Boolean)));
}

export async function bulkSoftDeleteReleases(
  releaseIds: string[]
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const ids = uniqueReleaseIds(releaseIds);
  if (ids.length === 0) {
    return { ok: false, message: 'No releases selected.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('press_releases')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/brand/dashboard');
  return { ok: true, count: data?.length ?? 0 };
}

export async function bulkUnpublishReleases(
  releaseIds: string[]
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const ids = uniqueReleaseIds(releaseIds);
  if (ids.length === 0) {
    return { ok: false, message: 'No releases selected.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('press_releases')
    .update({
      status: 'draft',
      published_at: null,
    })
    .in('id', ids)
    .eq('status', 'published')
    .is('deleted_at', null)
    .select('id');

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/brand/dashboard');
  return { ok: true, count: data?.length ?? 0 };
}

export async function bulkArchiveReleases(
  releaseIds: string[]
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const ids = uniqueReleaseIds(releaseIds);
  if (ids.length === 0) {
    return { ok: false, message: 'No releases selected.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Not signed in.' };
  }

  const { data, error } = await supabase
    .from('press_releases')
    .update({ status: 'archived' })
    .in('id', ids)
    .eq('status', 'published')
    .is('deleted_at', null)
    .select('id');

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath('/brand/dashboard');
  return { ok: true, count: data?.length ?? 0 };
}
