import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  applyDevProfileOverrides,
  applyDevSubscriptionOverrides,
} from '@/lib/auth/dev-profile-mock';
import { ERROR_MESSAGES } from '@/constants/copy';

export const runtime = 'nodejs';

const EmbargoUpdateSchema = z.object({
  embargo_until: z.string().datetime().nullable(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { 'release-id': string } }
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = EmbargoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'invalid_request' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: 'unauthenticated' }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  const profile = applyDevProfileOverrides(user.id, profileRow);

  if (profile?.user_type !== 'brand') {
    return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
  }

  const releaseId = String(params['release-id'] ?? '').trim();
  if (!releaseId) {
    return NextResponse.json({ success: false, error: 'invalid_release_id' }, { status: 400 });
  }

  const releaseRes = await supabase
    .from('press_releases')
    .select('id, status, brand_id')
    .eq('id', releaseId)
    .is('deleted_at', null)
    .maybeSingle();

  if (releaseRes.error) {
    return NextResponse.json(
      { success: false, error: releaseRes.error.message },
      { status: 500 }
    );
  }
  if (!releaseRes.data?.brand_id) {
    return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
  }
  if (releaseRes.data.status !== 'published') {
    return NextResponse.json(
      { success: false, error: 'Only published releases can be embargoed.' },
      { status: 400 }
    );
  }

  const brandRes = await supabase
    .from('brands')
    .select('id')
    .eq('id', releaseRes.data.brand_id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (brandRes.error) {
    return NextResponse.json(
      { success: false, error: brandRes.error.message },
      { status: 500 }
    );
  }
  if (!brandRes.data) {
    return NextResponse.json({ success: false, error: 'forbidden' }, { status: 403 });
  }

  // Lifting is always permitted. Setting a new embargo requires Growth/Enterprise.
  if (parsed.data.embargo_until) {
    const embargoAt = new Date(parsed.data.embargo_until);
    if (!Number.isFinite(embargoAt.getTime()) || embargoAt <= new Date()) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.embargoDateMustBeFuture },
        { status: 400 }
      );
    }

    const { data: subRow } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('owner_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    const sub = applyDevSubscriptionOverrides(user.id, subRow);
    const plan = sub?.plan;
    if (plan !== 'pro' && plan !== 'agency') {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.embargoNotAvailable },
        { status: 403 }
      );
    }
  }

  const { error: upErr } = await supabase
    .from('press_releases')
    .update({ embargo_until: parsed.data.embargo_until })
    .eq('id', releaseId)
    .is('deleted_at', null);

  if (upErr) {
    return NextResponse.json({ success: false, error: upErr.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data: { embargo_until: parsed.data.embargo_until },
  });
}

