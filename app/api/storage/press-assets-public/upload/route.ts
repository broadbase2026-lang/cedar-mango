import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeFilename } from '@/lib/utils/sanitizeFilename';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { ERROR_MESSAGES, PLAN_LIMITS } from '@/constants/copy';
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/constants/uploads';

export const runtime = 'nodejs';

const BUCKET = 'press-assets-public';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const form = await req.formData();
  const brandId = String(form.get('brandId') ?? '').trim();
  const file = form.get('file');

  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId.' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }

  const maxBytes = file.type.startsWith('image/')
    ? MAX_IMAGE_UPLOAD_BYTES
    : 25 * 1024 * 1024;

  if (file.size > maxBytes) {
    const label = file.type.startsWith('image/')
      ? `${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB`
      : '25MB';
    return NextResponse.json(
      { error: `File too large (max ${label}).` },
      { status: 413 }
    );
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found.' }, { status: 403 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  // Storage limit check (application-layer).
  // Align with billing reality: past_due customers still have a plan and should manage drafts/assets.
  const { data: subRow, error: subReadErr } = await admin
    .from('subscriptions')
    .select('plan, status')
    .eq('owner_id', user.id)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sub = applyDevSubscriptionOverrides(user.id, subRow);

  if (subReadErr) {
    return NextResponse.json(
      { error: subReadErr.message },
      { status: 500 }
    );
  }

  const subStatus = sub?.status;
  const hasBillableSubscription =
    subStatus === 'active' ||
    subStatus === 'trialing' ||
    subStatus === 'past_due';
  if (!hasBillableSubscription) {
    return NextResponse.json(
      { error: 'You need an active subscription to upload assets.' },
      { status: 403 }
    );
  }

  const planRaw = sub?.plan as 'starter' | 'pro' | 'agency' | null | undefined;
  // Rows may omit `plan` (e.g. trial placeholder or incomplete sync); trialing accounts still need uploads.
  const plan =
    planRaw ??
    (subStatus === 'trialing' || subStatus === 'past_due'
      ? ('starter' as const)
      : undefined);
  if (!plan) {
    return NextResponse.json(
      { error: 'You need an active subscription to upload assets.' },
      { status: 403 }
    );
  }

  const allowance = PLAN_LIMITS[plan]?.storageBytes ?? null;
  if (typeof allowance === 'number') {
    const usageRes = await admin
      .from('press_assets')
      .select('file_size_bytes')
      .eq('brand_id', brandId)
      .is('deleted_at', null);

    if (usageRes.error) {
      return NextResponse.json(
        { error: usageRes.error.message },
        { status: 500 }
      );
    }

    const used = (usageRes.data ?? []).reduce((acc, row) => {
      const n = row?.file_size_bytes;
      return acc + (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);
    }, 0);

    if (used + file.size > allowance) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.storageLimitReached },
        { status: 413 }
      );
    }
  }

  const safeName = sanitizeFilename(file.name || 'upload');
  const objectPath = `${brandId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectPath);

  return NextResponse.json({
    ok: true,
    bucket: BUCKET,
    path: objectPath,
    publicUrl: pub.publicUrl,
    fileName: file.name,
    size: file.size,
    mime: file.type,
  });
}

