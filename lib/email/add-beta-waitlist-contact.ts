import 'server-only';

import { Resend } from 'resend';
import { getResendEnv, resendNotConfiguredMessage } from '@/lib/email/resend-env';

export type BetaWaitlistAudience = 'journalist' | 'brand';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function addBetaWaitlistContact(params: {
  email: string;
  audience: BetaWaitlistAudience;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const env = getResendEnv();
  if (!env) {
    return { ok: false, error: resendNotConfiguredMessage() };
  }

  const email = params.email.trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const resend = new Resend(env.apiKey);
  const properties = {
    audience: params.audience,
    source: 'beta_waitlist',
  };

  const { error: createError } = await resend.contacts.create({
    email,
    unsubscribed: false,
    properties,
  });

  if (!createError) {
    return { ok: true };
  }

  const { error: updateError } = await resend.contacts.update({
    email,
    properties,
  });

  if (updateError) {
    console.error('[email] addBetaWaitlistContact failed', createError, updateError);
    return {
      ok: false,
      error: 'We could not add you to the waitlist. Please try again.',
    };
  }

  return { ok: true };
}
