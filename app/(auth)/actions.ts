'use server';

import { createClient } from '@/lib/supabase/server';
import {
  dashboardPathForUserType,
  sanitizeInternalNextParam,
} from '@/lib/auth/redirects';
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

export async function signupAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const userType = parseUserType(formData.get('user_type'));

  if (!email) return { error: 'Email is required.' };
  if (!password) return { error: 'Password is required.' };
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }
  if (!userType) {
    return { error: 'Choose whether you are signing up as a brand or a journalist.' };
  }

  const supabase = await createClient();

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

  const supabase = await createClient();

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

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
