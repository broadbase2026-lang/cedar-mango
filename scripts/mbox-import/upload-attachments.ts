import type { SupabaseClient } from '@supabase/supabase-js';
import { MAX_IMAGES_PER_PRESS_RELEASE } from '@/lib/constants/uploads';
import { sanitizeFilename } from '@/lib/utils/sanitizeFilename';
import type { ParsedAttachment } from './extract-message';

const PUBLIC_BUCKET = 'press-assets-public';
const PRIVATE_BUCKET = 'press-assets-private';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|heic|heif|bmp|tiff?)$/i;

function isImageAttachment(att: ParsedAttachment): boolean {
  if (att.contentType.startsWith('image/')) return true;
  return IMAGE_EXT.test(att.fileName);
}

function isPdfAttachment(att: ParsedAttachment): boolean {
  return (
    att.contentType === 'application/pdf' ||
    att.fileName.toLowerCase().endsWith('.pdf')
  );
}

export async function uploadMessageAttachments(input: {
  admin: SupabaseClient;
  brandId: string;
  releaseId: string;
  attachments: ParsedAttachment[];
}): Promise<{ uploaded: number; skipped: number }> {
  let uploaded = 0;
  let skipped = 0;
  let imageCount = 0;
  let heroSet = false;

  for (const att of input.attachments) {
    if (isImageAttachment(att)) {
      if (imageCount >= MAX_IMAGES_PER_PRESS_RELEASE) {
        skipped++;
        continue;
      }
      const ok = await uploadImage(input.admin, input.brandId, input.releaseId, att, !heroSet);
      if (ok) {
        uploaded++;
        imageCount++;
        if (!heroSet) heroSet = true;
      } else {
        skipped++;
      }
      continue;
    }

    if (isPdfAttachment(att)) {
      const ok = await uploadPdf(input.admin, input.brandId, input.releaseId, att);
      if (ok) uploaded++;
      else skipped++;
      continue;
    }

    skipped++;
  }

  return { uploaded, skipped };
}

async function uploadImage(
  admin: SupabaseClient,
  brandId: string,
  releaseId: string,
  att: ParsedAttachment,
  isHero: boolean
): Promise<boolean> {
  const safeName = sanitizeFilename(att.fileName || 'image.jpg');
  const objectPath = `${brandId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await admin.storage
    .from(PUBLIC_BUCKET)
    .upload(objectPath, att.content, {
      contentType: att.contentType || 'image/jpeg',
      upsert: false,
    });

  if (upErr) {
    console.error(`  [attachment] image upload failed: ${upErr.message}`);
    return false;
  }

  const { data: pub } = admin.storage.from(PUBLIC_BUCKET).getPublicUrl(objectPath);

  const { error: insertErr } = await admin.from('press_assets').insert({
    brand_id: brandId,
    press_release_id: releaseId,
    file_name: att.fileName,
    file_url: pub.publicUrl,
    file_type: 'image',
    file_size_bytes: att.size,
    caption: null,
    is_public: true,
    is_hero: isHero,
  });

  if (insertErr) {
    console.error(`  [attachment] image row insert failed: ${insertErr.message}`);
    return false;
  }

  return true;
}

async function uploadPdf(
  admin: SupabaseClient,
  brandId: string,
  releaseId: string,
  att: ParsedAttachment
): Promise<boolean> {
  const safeName = sanitizeFilename(att.fileName || 'document.pdf');
  const objectPath = `${brandId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await admin.storage
    .from(PRIVATE_BUCKET)
    .upload(objectPath, att.content, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (upErr) {
    console.error(`  [attachment] pdf upload failed: ${upErr.message}`);
    return false;
  }

  const { data: signed } = await admin.storage
    .from(PRIVATE_BUCKET)
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

  const fileUrl = signed?.signedUrl;
  if (!fileUrl) {
    console.error('  [attachment] pdf signed URL failed');
    return false;
  }

  const { error: insertErr } = await admin.from('press_assets').insert({
    brand_id: brandId,
    press_release_id: releaseId,
    file_name: att.fileName,
    file_url: fileUrl,
    file_type: 'pdf',
    file_size_bytes: att.size,
    caption: null,
    is_public: false,
    is_hero: false,
  });

  if (insertErr) {
    console.error(`  [attachment] pdf row insert failed: ${insertErr.message}`);
    return false;
  }

  return true;
}
