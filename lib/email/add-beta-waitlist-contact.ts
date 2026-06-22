import 'server-only';

import { Resend } from 'resend';
import { getResendEnv, resendNotConfiguredMessage } from '@/lib/email/resend-env';

export type BetaWaitlistAudience = 'journalist' | 'brand';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResendClientError = {
  name?: string;
  message?: string;
  statusCode?: number | null;
};

function mapContactError(error: ResendClientError): string {
  if (error.name === 'restricted_api_key') {
    return 'Waitlist signup is temporarily unavailable. Please try again later.';
  }

  if (process.env.NODE_ENV === 'development' && error.message) {
    return error.message;
  }

  return 'We could not add you to the waitlist. Please try again.';
}

async function upsertWaitlistContact(
  resend: Resend,
  email: string,
  audience: BetaWaitlistAudience
): Promise<{ ok: true } | { ok: false; error: ResendClientError }> {
  const properties = {
    audience,
    source: 'beta_waitlist',
  };

  const { error: createWithPropsError } = await resend.contacts.create({
    email,
    unsubscribed: false,
    properties,
  });

  if (!createWithPropsError) {
    return { ok: true };
  }

  if (createWithPropsError.name === 'validation_error') {
    const { error: createBareError } = await resend.contacts.create({
      email,
      unsubscribed: false,
    });

    if (!createBareError) {
      return { ok: true };
    }

    const { error: updateBareError } = await resend.contacts.update({
      email,
      unsubscribed: false,
    });

    if (!updateBareError) {
      return { ok: true };
    }

    return { ok: false, error: updateBareError };
  }

  const { error: updateError } = await resend.contacts.update({
    email,
    properties,
  });

  if (!updateError) {
    return { ok: true };
  }

  return { ok: false, error: updateError };
}

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
  const result = await upsertWaitlistContact(resend, email, params.audience);

  if (result.ok) {
    return { ok: true };
  }

  console.error('[email] addBetaWaitlistContact failed', {
    email,
    audience: params.audience,
    error: result.error,
  });

  return { ok: false, error: mapContactError(result.error) };
}
