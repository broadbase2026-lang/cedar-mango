'use server';

import { applyDevProfileOverrides } from '@/lib/auth/dev-profile-mock';
import { validateBetaInviteCode } from '@/lib/config/beta';
import { createClient } from '@/lib/supabase/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';
import {
  dashboardPathForUserType,
  sanitizeInternalNextParam,
} from '@/lib/auth/redirects';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserType } from '@/types';
import { redirect } from 'next/navigation';

export type AuthActionState = {
  error: string | null;
  needsEmailConfirmation?: boolean;
};

function parseUserType(raw: FormDataEntryValue | null): UserType | null {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (v === 'brand' || v === 'journalist') return v;
  return null;
}

function parseBool(raw: FormDataEntryValue | null): boolean {
  if (typeof raw !== 'string') return false;
  return raw.trim().toLowerCase() === 'true';
}

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const SIGN_IN_CONFIG_ERROR =
  'Sign-in is unavailable. Supabase is not configured on this server.';
const SIGN_UP_CONFIG_ERROR =
  'Sign-up is unavailable. Supabase is not configured on this server.';

function isSupabaseConfigError(message: string): boolean {
  return /Missing NEXT_PUBLIC_SUPABASE|URL and Key are required/i.test(message);
}

async function createAuthSupabaseClient(
  context: 'sign-in' | 'sign-up'
): Promise<
  { supabase: Awaited<ReturnType<typeof createClient>>; error: null } | { supabase: null; error: string }
> {
  const configError =
    context === 'sign-in' ? SIGN_IN_CONFIG_ERROR : SIGN_UP_CONFIG_ERROR;

  if (!getSupabasePublicEnv()) {
    return { supabase: null, error: configError };
  }

  try {
    const supabase = await createClient();
    return { supabase, error: null };
  } catch (err) {
    console.error('[auth action] createClient failed', err);
    const message = err instanceof Error ? err.message : String(err);
    if (isSupabaseConfigError(message)) {
      return { supabase: null, error: configError };
    }
    return {
      supabase: null,
      error:
        context === 'sign-in'
          ? 'Sign-in could not start. If you just updated env vars, redeploy production and try again.'
          : 'Sign-up could not start. If you just updated env vars, redeploy production and try again.',
    };
  }
}

export async function signupAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const userType = parseUserType(formData.get('user_type'));
  const wantsTrial = parseBool(formData.get('trial'));
  const inviteCode = String(formData.get('invite_code') ?? '').trim();

  const inviteError = validateBetaInviteCode(inviteCode);
  if (inviteError) return { error: inviteError };

  if (!email) return { error: 'Email is required.' };
  if (!password) return { error: 'Password is required.' };
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }
  if (!userType) {
    return { error: 'Choose whether you are signing up as a brand or a journalist.' };
  }

  const authClient = await createAuthSupabaseClient('sign-up');
  if (authClient.error || !authClient.supabase) {
    return { error: authClient.error ?? SIGN_UP_CONFIG_ERROR };
  }
  const supabase = authClient.supabase;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        user_type: userType,
        ...(fullName ? { full_name: fullName } : {}),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { error: null, needsEmailConfirmation: true };
  }

  if (userType === 'brand' && wantsTrial) {
    const ownerId = data.user?.id;
    if (!ownerId) {
      redirect('/brand/upload?trial=true');
    }

    const supabase = await createClient();

    // Create a minimal brand workspace so the user can immediately upload.
    const baseName = fullName || 'New Brand';
    const slugBase = slugify(baseName) || `brand-${ownerId.slice(0, 8)}`;
    const slug = `${slugBase}-${ownerId.slice(0, 6)}`;

    await supabase.from('brands').insert({
      owner_id: ownerId,
      name: baseName,
      slug,
    });

    // Insert trial subscription row using service role (subscriptions has no client insert policy).
    try {
      const admin = createAdminClient();
      const placeholderCustomerId = `trial_${crypto.randomUUID()}`;
      await admin.from('subscriptions').insert({
        owner_id: ownerId,
        stripe_customer_id: placeholderCustomerId,
        plan: 'starter',
        status: 'trialing',
        trial_mode: true,
        trial_releases_used: 0,
      });
    } catch {
      // If this fails (e.g. duplicate row), user can still proceed; guards will rely on DB state once present.
    }

    redirect('/brand/upload?trial=true');
  }

  redirect(dashboardPathForUserType(userType));
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const nextRaw = String(formData.get('next') ?? '').trim();

  if (!email) return { error: 'Email is required.' };
  if (!password) return { error: 'Password is required.' };

  const authClient = await createAuthSupabaseClient('sign-in');
  if (authClient.error || !authClient.supabase) {
    return { error: authClient.error ?? SIGN_IN_CONFIG_ERROR };
  }
  const supabase = authClient.supabase;

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Could not load session after sign-in.' };
  }

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  const profile = applyDevProfileOverrides(user.id, profileRow);

  if (profileError) {
    return { error: profileError.message };
  }

  if (!profile || (profile.user_type !== 'brand' && profile.user_type !== 'journalist')) {
    return {
      error:
        'Your account has no profile yet. Apply migration 007 (signup trigger) or contact support.',
    };
  }

  const safeNext = sanitizeInternalNextParam(nextRaw);
  if (safeNext) {
    redirect(safeNext);
  }

  redirect(dashboardPathForUserType(profile.user_type as UserType));
}
