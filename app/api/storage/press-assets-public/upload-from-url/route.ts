import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sanitizeFilename } from '@/lib/utils/sanitizeFilename';
import { resolveUploadSubscription } from '@/lib/brand/upload-subscription';
import { fetchImageForUpload } from '@/lib/brand/fetch-image-for-upload';
import { ERROR_MESSAGES, PLAN_LIMITS } from '@/constants/copy';

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const brandId =
    typeof body === 'object' &&
    body !== null &&
    'brandId' in body &&
    typeof (body as { brandId: unknown }).brandId === 'string'
      ? (body as { brandId: string }).brandId.trim()
      : '';
  const url =
    typeof body === 'object' &&
    body !== null &&
    'url' in body &&
    typeof (body as { url: unknown }).url === 'string'
      ? (body as { url: string }).url.trim()
      : '';

  if (!brandId) {
    return NextResponse.json({ error: 'Missing brandId.' }, { status: 400 });
  }
  if (!url) {
    return NextResponse.json({ error: 'Missing image URL.' }, { status: 400 });
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

  const subGate = await resolveUploadSubscription(admin, user.id);
  if (!subGate.ok) {
    return NextResponse.json({ error: subGate.error }, { status: 403 });
  }
  const { plan } = subGate;

  let fetched;
  try {
    fetched = await fetchImageForUpload(url);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Could not fetch image from URL.';
    const status =
      message.includes('not allowed') || message.includes('valid URL')
        ? 400
        : message.includes('too large')
          ? 413
          : 400;
    return NextResponse.json({ error: message }, { status });
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

    if (used + fetched.bytes.byteLength > allowance) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.storageLimitReached },
        { status: 413 }
      );
    }
  }

  const safeName = sanitizeFilename(fetched.fileName || 'image.jpg');
  const objectPath = `${brandId}/${Date.now()}-${safeName}`;
  const fileBuffer = Buffer.from(fetched.bytes);

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(objectPath, fileBuffer, {
      contentType: fetched.contentType || undefined,
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
    fileName: safeName,
    size: fetched.bytes.byteLength,
    mime: fetched.contentType,
  });
}
