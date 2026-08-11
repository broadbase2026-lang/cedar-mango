'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePayableSubscription } from '@/lib/brand/subscription-guards';
import {
  isTrialReleaseLimitError,
  TRIAL_RELEASE_LIMIT_ERROR_CODE,
} from '@/lib/brand/trial-release-limit';
import {
  attachPendingAssetsToRelease,
  maxImagesForTrial,
  parsePendingReleaseAssets,
} from '@/lib/brand/pending-release-assets';
import { richTextToPlainText, sanitizeRichTextHtml } from '@/lib/rich-text/sanitize';

export type CreateReleaseState = { error: string | null };

export type SavePressReleaseDraftResult =
  | { ok: true; releaseId: string }
  | { ok: false; errorCode: string };

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function uniqueSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

const MAX_IMAGE_LINK_LENGTH = 2048;

function isValidImageLink(raw: string): boolean {
  if (raw.length > MAX_IMAGE_LINK_LENGTH) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function persistPressReleaseCreate(
  formData: FormData
): Promise<SavePressReleaseDraftResult> {
  const title = String(formData.get('title') ?? '').trim();
  const bodyRaw = String(formData.get('body') ?? '');
  let bodyText: string;
  let body: string;

  try {
    bodyText = richTextToPlainText(bodyRaw);
    body = sanitizeRichTextHtml(bodyRaw).trim();
  } catch (e) {
    console.error('[persistPressReleaseCreate] rich text sanitize failed', e);
    return { ok: false, errorCode: 'invalid_rich_text' };
  }

  const summary = String(formData.get('summary') ?? '').trim() || null;
  const imageLinkRaw = String(formData.get('image_link') ?? '').trim();
  const imageLink = imageLinkRaw || null;
  const vertical = String(formData.get('industry_vertical') ?? '').trim() || null;
  const tagsRaw = String(formData.get('tags') ?? '').trim();
  const tags =
    tagsRaw.length > 0
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];

  if (!title) {
    return { ok: false, errorCode: 'missing_title' };
  }
  if (!bodyText) {
    return { ok: false, errorCode: 'missing_body' };
  }
  if (bodyText.length > 500_000) {
    return { ok: false, errorCode: 'body_too_long' };
  }
  if (summary && summary.length > 280) {
    return { ok: false, errorCode: 'summary_too_long' };
  }
  if (imageLink && !isValidImageLink(imageLink)) {
    return { ok: false, errorCode: 'invalid_image_link' };
  }

  const pendingRaw = String(formData.get('pending_assets') ?? '');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errorCode: 'not_signed_in' };
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!brand) {
    return { ok: false, errorCode: 'no_brand' };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, errorCode: 'create_failed' };
  }

  const payable = await resolvePayableSubscription(admin, user.id);
  const maxImages = maxImagesForTrial(Boolean(payable?.trialMode));

  if (payable?.trialMode) {
    if (payable.releasesUsed >= 1) {
      return { ok: false, errorCode: TRIAL_RELEASE_LIMIT_ERROR_CODE };
    }

    const { count: releaseCount, error: countErr } = await admin
      .from('press_releases')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brand.id)
      .is('deleted_at', null);

    if (!countErr && (releaseCount ?? 0) >= 1) {
      return { ok: false, errorCode: TRIAL_RELEASE_LIMIT_ERROR_CODE };
    }
  }

  const pendingAssets = parsePendingReleaseAssets(pendingRaw, brand.id, maxImages);
  if (pendingAssets === 'invalid') {
    return { ok: false, errorCode: 'invalid_pending_assets' };
  }

  const base = slugify(title) || 'release';
  const slug = `${base}-${uniqueSuffix()}`;

  const { data: created, error } = await supabase
    .from('press_releases')
    .insert({
      brand_id: brand.id,
      title,
      slug,
      body,
      summary,
      image_link: imageLink,
      industry_vertical: vertical,
      tags,
      status: 'draft',
    })
    .select('id')
    .maybeSingle();

  if (error || !created?.id) {
    if (isTrialReleaseLimitError(error?.message)) {
      return { ok: false, errorCode: TRIAL_RELEASE_LIMIT_ERROR_CODE };
    }
    console.error('[persistPressReleaseCreate] press_releases insert', error);
    return { ok: false, errorCode: 'create_failed' };
  }

  if (pendingAssets.length > 0) {
    const { error: assetErr } = await attachPendingAssetsToRelease(
      admin,
      brand.id,
      created.id,
      pendingAssets
    );
    if (assetErr) {
      console.error('[persistPressReleaseCreate] press_assets insert', assetErr);
      revalidatePath('/brand/dashboard');
      revalidatePath('/brand/upload');
      return { ok: false, errorCode: 'assets_failed' };
    }
  }

  revalidatePath('/brand/dashboard');
  revalidatePath('/brand/upload');
  return { ok: true, releaseId: created.id };
}

export async function createPressReleaseDraftAction(
  formData: FormData
): Promise<SavePressReleaseDraftResult> {
  try {
    return await persistPressReleaseCreate(formData);
  } catch (e) {
    console.error('[createPressReleaseDraftAction] unhandled exception', e);
    return { ok: false, errorCode: 'create_failed' };
  }
}

export async function createPressReleaseAction(formData: FormData) {
  try {
    const result = await persistPressReleaseCreate(formData);
    if (!result.ok) {
      if (result.errorCode === 'not_signed_in') {
        redirect('/login');
      }
      if (result.errorCode === 'no_brand') {
        redirect('/brand/settings');
      }
      redirect(
        `/brand/releases/new?error=${encodeURIComponent(result.errorCode)}`
      );
    }
    redirect(
      `/brand/releases/new?edit=${encodeURIComponent(result.releaseId)}&saved=true`
    );
  } catch (e) {
    // Next.js `redirect()` throws a special exception; don't swallow it,
    // otherwise the browser can surface a generic "Failed to fetch".
    const digest = (e as any)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    if (typeof digest === 'string' && digest.startsWith('NEXT_NOT_FOUND')) {
      throw e;
    }
    // Any unhandled exception should still turn into a safe redirect, not a generic
    // client-side "Failed to fetch".
    console.error('[createPressReleaseAction] unhandled exception', e);
    redirect('/brand/releases/new?error=create_failed');
  }
}

async function persistPressReleaseUpdate(
  formData: FormData
): Promise<SavePressReleaseDraftResult> {
  const releaseId = String(formData.get('release_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const bodyRaw = String(formData.get('body') ?? '');
  let bodyText: string;
  let body: string;

  try {
    bodyText = richTextToPlainText(bodyRaw);
    body = sanitizeRichTextHtml(bodyRaw).trim();
  } catch (e) {
    console.error('[persistPressReleaseUpdate] rich text sanitize failed', e);
    return { ok: false, errorCode: 'invalid_rich_text' };
  }

  const summary = String(formData.get('summary') ?? '').trim() || null;
  const imageLinkRaw = String(formData.get('image_link') ?? '').trim();
  const imageLink = imageLinkRaw || null;
  const vertical = String(formData.get('industry_vertical') ?? '').trim() || null;
  const tagsRaw = String(formData.get('tags') ?? '').trim();
  const tags =
    tagsRaw.length > 0
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];

  if (!releaseId) {
    return { ok: false, errorCode: 'missing_release' };
  }
  if (!title) {
    return { ok: false, errorCode: 'missing_title' };
  }
  if (!bodyText) {
    return { ok: false, errorCode: 'missing_body' };
  }
  if (bodyText.length > 500_000) {
    return { ok: false, errorCode: 'body_too_long' };
  }
  if (summary && summary.length > 280) {
    return { ok: false, errorCode: 'summary_too_long' };
  }
  if (imageLink && !isValidImageLink(imageLink)) {
    return { ok: false, errorCode: 'invalid_image_link' };
  }

  const pendingRaw = String(formData.get('pending_assets') ?? '');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, errorCode: 'not_signed_in' };
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!brand) {
    return { ok: false, errorCode: 'no_brand' };
  }

  const existing = await supabase
    .from('press_releases')
    .select('id, status')
    .eq('id', releaseId)
    .eq('brand_id', brand.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return { ok: false, errorCode: 'not_found' };
  }
  if (existing.data.status === 'published') {
    return { ok: false, errorCode: 'already_published' };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, errorCode: 'create_failed' };
  }

  const { data: subscriptionRow } = await admin
    .from('subscriptions')
    .select('trial_mode')
    .eq('owner_id', user.id)
    .maybeSingle();

  const subscription = applyDevSubscriptionOverrides(user.id, subscriptionRow);
  const maxImages = maxImagesForTrial(Boolean(subscription?.trial_mode));
  const pendingAssets = parsePendingReleaseAssets(pendingRaw, brand.id, maxImages);
  if (pendingAssets === 'invalid') {
    return { ok: false, errorCode: 'invalid_pending_assets' };
  }

  const { error } = await supabase
    .from('press_releases')
    .update({
      title,
      body,
      summary,
      image_link: imageLink,
      industry_vertical: vertical,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq('id', releaseId)
    .eq('brand_id', brand.id)
    .is('deleted_at', null);

  if (error) {
    console.error('[persistPressReleaseUpdate] update failed', error);
    return { ok: false, errorCode: 'create_failed' };
  }

  if (pendingAssets.length > 0) {
    const { error: assetErr } = await attachPendingAssetsToRelease(
      admin,
      brand.id,
      releaseId,
      pendingAssets
    );
    if (assetErr) {
      console.error('[persistPressReleaseUpdate] press_assets insert', assetErr);
      return { ok: false, errorCode: 'assets_failed' };
    }
    revalidatePath('/brand/upload');
  }

  revalidatePath('/brand/dashboard');
  revalidatePath('/brand/releases/new');
  return { ok: true, releaseId };
}

export async function savePressReleaseDraftAction(
  formData: FormData
): Promise<SavePressReleaseDraftResult> {
  try {
    return await persistPressReleaseUpdate(formData);
  } catch (e) {
    console.error('[savePressReleaseDraftAction] unhandled exception', e);
    return { ok: false, errorCode: 'create_failed' };
  }
}

export async function updatePressReleaseAction(formData: FormData) {
  try {
    const releaseId = String(formData.get('release_id') ?? '').trim();
    const result = await persistPressReleaseUpdate(formData);

    if (!result.ok) {
      const editParam = releaseId
        ? `edit=${encodeURIComponent(releaseId)}&`
        : '';
      if (result.errorCode === 'missing_release' || result.errorCode === 'not_found') {
        redirect('/brand/dashboard?section=releases');
      }
      if (result.errorCode === 'not_signed_in') {
        redirect('/login');
      }
      if (result.errorCode === 'no_brand') {
        redirect('/brand/settings');
      }
      if (result.errorCode === 'already_published') {
        redirect('/brand/dashboard?section=releases');
      }
      redirect(
        `/brand/releases/new?${editParam}error=${encodeURIComponent(result.errorCode)}`
      );
    }

    redirect(
      `/brand/releases/new?edit=${encodeURIComponent(result.releaseId)}&saved=true`
    );
  } catch (e) {
    const digest = (e as any)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    if (typeof digest === 'string' && digest.startsWith('NEXT_NOT_FOUND')) {
      throw e;
    }
    console.error('[updatePressReleaseAction] unhandled exception', e);
    redirect('/brand/dashboard?section=releases');
  }
}

