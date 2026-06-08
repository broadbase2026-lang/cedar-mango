import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/constants/uploads';
import { sanitizeFilename } from '@/lib/utils/sanitizeFilename';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Reuse the existing public bucket (world-readable objects).
const BUCKET = 'press-assets-public';
const AVATAR_SIZE = 350;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }

  if (!file.type || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image.' }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Image too large (max ${MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)}MB).` },
      { status: 413 }
    );
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

  let outBuffer: Buffer;
  try {
    const inBuffer = Buffer.from(await file.arrayBuffer());
    outBuffer = await sharp(inBuffer)
      .rotate() // respect EXIF orientation
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'Failed to process image.' }, { status: 400 });
  }

  const safeName = sanitizeFilename(file.name || 'avatar');
  const baseName = safeName.replace(/\.[a-z0-9]+$/i, '') || 'avatar';
  const objectPath = `avatars/${user.id}/${Date.now()}-${baseName}.webp`;

  const { error: upErr } = await admin.storage.from(BUCKET).upload(objectPath, outBuffer, {
    contentType: 'image/webp',
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
    size: outBuffer.byteLength,
    mime: 'image/webp',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  });
}

