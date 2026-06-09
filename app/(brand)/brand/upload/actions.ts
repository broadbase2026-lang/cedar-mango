'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { resolvePayableSubscription } from '@/lib/brand/subscription-guards';
import { maxImagesForTrial } from '@/lib/brand/pending-release-assets';
import { createAdminClient } from '@/lib/supabase/admin';

export type MediaActionState = {
  error: string | null;
  success?: boolean;
  assetId?: string;
};

const FILE_TYPES = new Set(['image', 'pdf', 'video', 'document']);

async function assertBrandOwnsRelease(
  supabase: SupabaseClient,
  brandId: string,
  releaseId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('press_releases')
    .select('id')
    .eq('id', releaseId)
    .eq('brand_id', brandId)
    .is('deleted_at', null)
    .maybeSingle();
  return Boolean(data);
}

export async function registerPressAsset(input: {
  brandId: string;
  pressReleaseId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number | null;
  caption: string | null;
  isPublic: boolean;
  isHero: boolean;
}): Promise<MediaActionState> {
  if (!FILE_TYPES.has(input.fileType)) {
    return { error: 'Invalid file type.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const admin = createAdminClient();

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', input.brandId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!brand) {
    return { error: 'Brand not found or access denied.' };
  }

  const owns = await assertBrandOwnsRelease(
    supabase,
    input.brandId,
    input.pressReleaseId
  );
  if (!owns) {
    return { error: 'That release does not belong to this workspace.' };
  }

  if (input.isHero && input.fileType !== 'image') {
    return { error: 'Only images can be marked as hero assets.' };
  }

  const payable = await resolvePayableSubscription(admin, user.id);
  const imageCap = maxImagesForTrial(Boolean(payable?.trialMode));

  if (input.fileType === 'image') {
    const { count, error: countErr } = await admin
      .from('press_assets')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', input.brandId)
      .eq('press_release_id', input.pressReleaseId)
      .eq('file_type', 'image')
      .is('deleted_at', null);

    if (countErr) {
      return { error: countErr.message };
    }
    if ((count ?? 0) >= imageCap) {
      return {
        error:
          imageCap === maxImagesForTrial(true)
            ? `Free trial allows up to ${imageCap} images per press release. Upgrade to attach more.`
            : `Maximum ${maxImagesForTrial(false)} images per press release.`,
      };
    }
  }

  if (input.isHero) {
    await admin
      .from('press_assets')
      .update({ is_hero: false })
      .eq('press_release_id', input.pressReleaseId)
      .eq('brand_id', input.brandId)
      .is('deleted_at', null);
  }

  // Use service-role for writes: RLS can be flaky in server actions depending on auth cookie
  // propagation. We already verified ownership above, so this stays safe.
  const { data: inserted, error } = await admin
    .from('press_assets')
    .insert({
      brand_id: input.brandId,
      press_release_id: input.pressReleaseId,
      file_name: input.fileName,
      file_url: input.fileUrl,
      file_type: input.fileType,
      file_size_bytes: input.fileSizeBytes,
      caption: input.caption,
      is_public: input.isPublic,
      is_hero: input.isHero,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return {
        error:
          'Hero asset conflict — another file may already be hero for this release.',
      };
    }
    return { error: error.message };
  }

  revalidatePath('/brand/upload');
  revalidatePath('/dashboard/brand');
  revalidatePath('/brand/releases/new');
  return { error: null, success: true, assetId: inserted?.id };
}

export async function softDeletePressAsset(input: {
  brandId: string;
  assetId: string;
}): Promise<MediaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const admin = createAdminClient();

  // Ensure the asset belongs to the current owner before mutating.
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', input.brandId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!brand) {
    return { error: 'Brand not found or access denied.' };
  }

  const { error } = await admin
    .from('press_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.assetId)
    .eq('brand_id', input.brandId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/brand/upload');
  revalidatePath('/dashboard/brand');
  return { error: null, success: true };
}

export async function clearHeroForRelease(input: {
  brandId: string;
  pressReleaseId: string;
}): Promise<MediaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const admin = createAdminClient();

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', input.brandId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!brand) {
    return { error: 'Brand not found or access denied.' };
  }

  const owns = await assertBrandOwnsRelease(
    supabase,
    input.brandId,
    input.pressReleaseId
  );
  if (!owns) {
    return { error: 'That release does not belong to this workspace.' };
  }

  const { error } = await admin
    .from('press_assets')
    .update({ is_hero: false })
    .eq('press_release_id', input.pressReleaseId)
    .eq('brand_id', input.brandId)
    .is('deleted_at', null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/brand/upload');
  return { error: null, success: true };
}

export async function setPressAssetHero(input: {
  brandId: string;
  assetId: string;
}): Promise<MediaActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const admin = createAdminClient();

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', input.brandId)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!brand) {
    return { error: 'Brand not found or access denied.' };
  }

  const { data: asset } = await supabase
    .from('press_assets')
    .select('id, press_release_id, file_type')
    .eq('id', input.assetId)
    .eq('brand_id', input.brandId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!asset?.press_release_id) {
    return { error: 'Asset not found.' };
  }
  if (asset.file_type !== 'image') {
    return { error: 'Only images can be hero assets.' };
  }

  await admin
    .from('press_assets')
    .update({ is_hero: false })
    .eq('press_release_id', asset.press_release_id)
    .eq('brand_id', input.brandId)
    .is('deleted_at', null);

  const { error } = await admin
    .from('press_assets')
    .update({ is_hero: true })
    .eq('id', input.assetId)
    .eq('brand_id', input.brandId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/brand/upload');
  revalidatePath('/dashboard/brand');
  return { error: null, success: true };
}
