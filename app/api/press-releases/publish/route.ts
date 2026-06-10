import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePayableSubscription } from '@/lib/brand/subscription-guards';
import { ERROR_MESSAGES, PLAN_LIMITS } from '@/constants/copy';

type ApiResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string; data?: { redirectTo?: string } };

function json(result: ApiResult, status = 200) {
  return NextResponse.json(result, { status });
}

const BodySchema = z.object({
  releaseId: z.string().min(1),
  embargo_until: z
    .union([z.string().datetime(), z.string().min(1)])
    .optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ success: false, error: 'invalid_request' }, 400);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ success: false, error: 'unauthenticated' }, 401);
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return json({ success: false, error: 'server_misconfigured' }, 500);
  }

  // Ownership check (explicit): ensure the release belongs to the requesting user.
  const releaseRes = await supabase
    .from('press_releases')
    .select('id, status, brand_id')
    .eq('id', parsed.data.releaseId)
    .is('deleted_at', null)
    .maybeSingle();

  if (releaseRes.error) {
    return json({ success: false, error: releaseRes.error.message }, 500);
  }
  if (!releaseRes.data?.brand_id) {
    return json({ success: false, error: 'not_found' }, 404);
  }

  const brandRes = await supabase
    .from('brands')
    .select('id')
    .eq('id', releaseRes.data.brand_id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (brandRes.error) {
    return json({ success: false, error: brandRes.error.message }, 500);
  }
  if (!brandRes.data) {
    return json({ success: false, error: 'forbidden' }, 403);
  }

  const subscription = await resolvePayableSubscription(admin, user.id);

  if (!subscription) {
    return json({ success: false, error: 'subscription_required' }, 403);
  }

  const { trialMode, releasesUsed, plan: subPlan, releasesPublishedThisPeriod } =
    subscription;

  if (trialMode && releasesUsed >= 1) {
    return json(
      {
        success: false,
        error: 'upgrade_required',
        data: { redirectTo: '/pricing?reason=release-limit' },
      },
      200
    );
  }

  // Embargo scheduling is not available on Solo (starter).
  if (parsed.data.embargo_until && subPlan === 'starter') {
    return NextResponse.json(
      { success: false, error: ERROR_MESSAGES.embargoNotAvailable },
      { status: 403 }
    );
  }

  if (parsed.data.embargo_until) {
    const embargoAt = new Date(parsed.data.embargo_until);
    if (!Number.isFinite(embargoAt.getTime()) || embargoAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.embargoDateMustBeFuture },
        { status: 400 }
      );
    }
  }

  // Monthly publish-limit enforcement (application-layer only).
  const tierLimit = PLAN_LIMITS[subPlan]?.releasesPerPeriod ?? null;
  const publishedThisPeriod = releasesPublishedThisPeriod;

  if (typeof tierLimit === 'number' && publishedThisPeriod >= tierLimit) {
    return NextResponse.json(
      { success: false, error: ERROR_MESSAGES.publishLimitReached },
      { status: 200 }
    );
  }

  if (releaseRes.data.status !== 'draft') {
    return json({ success: false, error: 'invalid_status' }, 400);
  }

  const now = new Date().toISOString();
  const updatePayload: {
    status: 'published';
    published_at: string;
    embargo_until?: string;
  } = {
    status: 'published',
    published_at: now,
  };
  if (parsed.data.embargo_until) {
    updatePayload.embargo_until = parsed.data.embargo_until;
  }

  const { error } = await supabase
    .from('press_releases')
    .update(updatePayload)
    .eq('id', parsed.data.releaseId)
    .is('deleted_at', null);

  if (error) {
    return json({ success: false, error: error.message }, 400);
  }

  if (trialMode) {
    await admin
      .from('subscriptions')
      .update({ trial_releases_used: releasesUsed + 1 })
      .eq('owner_id', user.id);
  }

  if (typeof tierLimit === 'number') {
    await admin
      .from('subscriptions')
      .update({ releases_published_this_period: publishedThisPeriod + 1 })
      .eq('owner_id', user.id);
  }

  return json({ success: true, data: { id: parsed.data.releaseId } }, 200);
}

