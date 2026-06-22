'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  BETA_ACCESS_COOKIE,
  betaAccessToken,
  betaSitePassword,
  sanitizeBetaNextParam,
} from '@/lib/config/beta';
import {
  addBetaWaitlistContact,
  type BetaWaitlistAudience,
} from '@/lib/email/add-beta-waitlist-contact';

export type BetaAccessActionState = {
  error: string | null;
};

export type BetaWaitlistActionState = {
  error: string | null;
  success: boolean;
};

export async function betaWaitlistAction(
  _prev: BetaWaitlistActionState,
  formData: FormData
): Promise<BetaWaitlistActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const audience = String(formData.get('audience') ?? '');

  if (audience !== 'journalist' && audience !== 'brand') {
    return { error: 'Choose journalist or brand.', success: false };
  }

  const result = await addBetaWaitlistContact({
    email,
    audience: audience as BetaWaitlistAudience,
  });

  if (!result.ok) {
    return { error: result.error, success: false };
  }

  return { error: null, success: true };
}

export async function betaAccessAction(
  _prev: BetaAccessActionState,
  formData: FormData
): Promise<BetaAccessActionState> {
  const password = String(formData.get('password') ?? '').trim();
  const next = sanitizeBetaNextParam(String(formData.get('next') ?? ''));

  if (!betaSitePassword) {
    redirect(next);
  }

  if (password !== betaSitePassword) {
    return { error: 'Incorrect password.' };
  }

  const token = await betaAccessToken(betaSitePassword);
  const cookieStore = await cookies();
  cookieStore.set(BETA_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next);
}
