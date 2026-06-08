'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { recordAgencyNameChange } from '@/lib/brand/agency-audit';
import { syncBrandMetadataToStripe } from '@/lib/stripe/sync-brand-metadata';
import { PLAN_LIMITS } from '@/constants/copy';

export type SettingsActionState = {
  error: string | null;
  success?: boolean;
  redirectTo?: string;
};

export async function updateAccountAvatar(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const avatarUrl = String(formData.get('avatar_url') ?? '').trim();
  if (!avatarUrl) {
    return { error: 'Missing avatar URL.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/brand/settings');
  revalidatePath('/dashboard/brand');
  return { error: null, success: true };
}

const VERTICALS = new Set([
  'fnb',
  'travel',
  'culture',
  'fashion',
  'lifestyle',
  'other',
]);

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function slugIsLocked(
  supabase: SupabaseClient,
  brandId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('press_releases')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('status', 'published')
    .is('deleted_at', null);
  return (count ?? 0) > 0;
}

export async function updateAccountName(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const fullName = String(formData.get('full_name') ?? '').trim();
  if (!fullName) {
    return { error: 'Name is required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/brand/settings');
  revalidatePath('/dashboard/brand');
  return { error: null, success: true };
}

export async function saveBrandWorkspace(
  _prev: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not signed in.' };
  }

  const name = String(formData.get('name') ?? '').trim();
  let slug = normalizeSlug(String(formData.get('slug') ?? ''));
  const description = String(formData.get('description') ?? '').trim() || null;
  const websiteRaw = String(formData.get('website') ?? '').trim();
  const website = websiteRaw || null;
  const logoUrlRaw = String(formData.get('logo_url') ?? '').trim();
  const logo_url = logoUrlRaw || null;
  const verticalRaw = String(formData.get('industry_vertical') ?? '').trim();

  if (!name) {
    return { error: 'Brand name is required.' };
  }

  if (!verticalRaw || !VERTICALS.has(verticalRaw)) {
    return { error: 'Choose a valid industry vertical.' };
  }

  const { data: existing } = await supabase
    .from('brands')
    .select('id, slug, name')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  let locked = false;
  if (existing) {
    locked = await slugIsLocked(supabase, existing.id);
    if (locked) {
      slug = existing.slug;
    }
  } else {
    if (!slug) {
      return { error: 'URL slug is required for a new brand.' };
    }
    if (!SLUG_RE.test(slug)) {
      return {
        error:
          'Slug may only use lowercase letters, numbers, and single hyphens (e.g. acme-hospitality).',
      };
    }
  }

  if (existing && !locked) {
    if (!slug) {
      return { error: 'URL slug is required.' };
    }
    if (!SLUG_RE.test(slug)) {
      return {
        error:
          'Slug may only use lowercase letters, numbers, and single hyphens (e.g. acme-hospitality).',
      };
    }
  }

  const payload = {
    name,
    slug,
    description,
    website,
    logo_url,
    industry_vertical: verticalRaw,
  };

  if (existing) {
    const oldName = existing.name;
    const { error } = await supabase
      .from('brands')
      .update(payload)
      .eq('id', existing.id)
      .eq('owner_id', user.id);

    if (error) {
      if (error.code === '23505') {
        return { error: 'That URL slug is already taken. Try another.' };
      }
      return { error: error.message };
    }

    if (oldName !== name) {
      try {
        const admin = createAdminClient();
        await recordAgencyNameChange(admin, {
          brandId: existing.id,
          ownerId: user.id,
          oldName,
          newName: name,
        });
        await syncBrandMetadataToStripe(admin, user.id);
      } catch (err) {
        console.error('[settings] agency audit / stripe sync failed', err);
      }
    } else {
      try {
        const admin = createAdminClient();
        await syncBrandMetadataToStripe(admin, user.id);
      } catch (err) {
        console.error('[settings] stripe metadata sync failed', err);
      }
    }
  } else {
    const { data: subscriptionRow } = await supabase
      .from('subscriptions')
      .select('trial_mode, plan, status')
      .eq('owner_id', user.id)
      .maybeSingle();

    const subscription = applyDevSubscriptionOverrides(user.id, subscriptionRow);

    const isTrial = Boolean(subscription?.trial_mode);

    if (isTrial) {
      const { count } = await supabase
        .from('brands')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .is('deleted_at', null);

      if ((count ?? 0) >= 1) {
        return { error: null, redirectTo: '/pricing?reason=trial_brand_limit' };
      }
    }

    const plan =
      subscription?.status === 'active' || subscription?.status === 'trialing'
        ? ((subscription?.plan ?? null) as 'starter' | 'pro' | 'agency' | null)
        : null;

    if (plan) {
      const limit = PLAN_LIMITS[plan]?.brands ?? null;
      if (typeof limit === 'number') {
        const { count } = await supabase
          .from('brands')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', user.id)
          .is('deleted_at', null);

        if ((count ?? 0) >= limit) {
          return { error: 'Brand limit reached for your plan. Upgrade to add more brands.' };
        }
      }
    }

    const { error } = await supabase.from('brands').insert({
      owner_id: user.id,
      ...payload,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: 'That URL slug is already taken. Try another.' };
      }
      return { error: error.message };
    }

    try {
      const admin = createAdminClient();
      await syncBrandMetadataToStripe(admin, user.id);
    } catch (err) {
      console.error('[settings] stripe metadata sync failed', err);
    }
  }

  revalidatePath('/brand/settings');
  revalidatePath('/dashboard/brand');
  revalidatePath('/brand/upload');
  return { error: null, success: true };
}
