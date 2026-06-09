'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  attachPendingAssetsToRelease,
  maxImagesForTrial,
  parsePendingReleaseAssets,
} from '@/lib/brand/pending-release-assets';
import { richTextToPlainText, sanitizeRichTextHtml } from '@/lib/rich-text/sanitize';

export type CreateReleaseState = { error: string | null };

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

export async function createPressReleaseAction(formData: FormData) {
  try {
    const title = String(formData.get('title') ?? '').trim();
    const bodyRaw = String(formData.get('body') ?? '');
    let bodyText: string;
    let body: string;

    try {
      bodyText = richTextToPlainText(bodyRaw);
      body = sanitizeRichTextHtml(bodyRaw).trim();
    } catch (e) {
      // If sanitization blows up (malformed HTML, unexpected input), surface a normal redirect
      // rather than letting the server action crash and appear as "Failed to fetch" client-side.
      console.error('[createPressReleaseAction] rich text sanitize failed', e);
      redirect('/brand/releases/new?error=invalid_rich_text');
    }

    const summary = String(formData.get('summary') ?? '').trim() || null;
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
      redirect('/brand/releases/new?error=missing_title');
    }
    if (!bodyText) {
      redirect('/brand/releases/new?error=missing_body');
    }
    if (bodyText.length > 500_000) {
      redirect('/brand/releases/new?error=body_too_long');
    }
    if (summary && summary.length > 280) {
      redirect('/brand/releases/new?error=summary_too_long');
    }

    const pendingRaw = String(formData.get('pending_assets') ?? '');
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect('/login');
    }

    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!brand) {
      redirect('/brand/settings');
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      redirect('/brand/releases/new?error=create_failed');
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
      redirect('/brand/releases/new?error=invalid_pending_assets');
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
        industry_vertical: vertical,
        tags,
        status: 'draft',
      })
      .select('id')
      .maybeSingle();

    if (error || !created?.id) {
      redirect('/brand/releases/new?error=create_failed');
    }

    if (pendingAssets.length > 0) {
      const { error: assetErr } = await attachPendingAssetsToRelease(
        admin,
        brand.id,
        created.id,
        pendingAssets
      );
      if (assetErr) {
        console.error('[createPressReleaseAction] press_assets insert', assetErr);
        redirect('/brand/releases/new?error=assets_failed');
      }
      revalidatePath('/dashboard/brand');
      revalidatePath('/brand/upload');
    }

    redirect('/dashboard/brand?section=releases');
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

export async function updatePressReleaseAction(formData: FormData) {
  try {
    const releaseId = String(formData.get('release_id') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const bodyRaw = String(formData.get('body') ?? '');
    let bodyText: string;
    let body: string;

    try {
      bodyText = richTextToPlainText(bodyRaw);
      body = sanitizeRichTextHtml(bodyRaw).trim();
    } catch (e) {
      console.error('[updatePressReleaseAction] rich text sanitize failed', e);
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=invalid_rich_text`);
    }

    const summary = String(formData.get('summary') ?? '').trim() || null;
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
      redirect('/dashboard/brand?section=releases');
    }
    if (!title) {
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=missing_title`);
    }
    if (!bodyText) {
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=missing_body`);
    }
    if (bodyText.length > 500_000) {
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=body_too_long`);
    }
    if (summary && summary.length > 280) {
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=summary_too_long`);
    }

    const pendingRaw = String(formData.get('pending_assets') ?? '');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect('/login');
    }

    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!brand) {
      redirect('/brand/settings');
    }

    const existing = await supabase
      .from('press_releases')
      .select('id, status')
      .eq('id', releaseId)
      .eq('brand_id', brand.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing.error || !existing.data) {
      redirect('/dashboard/brand?section=releases');
    }
    if (existing.data.status === 'published') {
      redirect('/dashboard/brand?section=releases');
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch {
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=create_failed`);
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
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=invalid_pending_assets`);
    }

    const { error } = await supabase
      .from('press_releases')
      .update({
        title,
        body,
        summary,
        industry_vertical: vertical,
        tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', releaseId)
      .eq('brand_id', brand.id)
      .is('deleted_at', null);

    if (error) {
      console.error('[updatePressReleaseAction] update failed', error);
      redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=create_failed`);
    }

    if (pendingAssets.length > 0) {
      const { error: assetErr } = await attachPendingAssetsToRelease(
        admin,
        brand.id,
        releaseId,
        pendingAssets
      );
      if (assetErr) {
        console.error('[updatePressReleaseAction] press_assets insert', assetErr);
        redirect(`/brand/releases/new?edit=${encodeURIComponent(releaseId)}&error=assets_failed`);
      }
      revalidatePath('/brand/upload');
    }

    revalidatePath('/dashboard/brand');
    redirect('/dashboard/brand?section=releases');
  } catch (e) {
    const digest = (e as any)?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      throw e;
    }
    if (typeof digest === 'string' && digest.startsWith('NEXT_NOT_FOUND')) {
      throw e;
    }
    console.error('[updatePressReleaseAction] unhandled exception', e);
    redirect('/dashboard/brand?section=releases');
  }
}

