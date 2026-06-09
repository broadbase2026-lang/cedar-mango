import 'server-only';

import { getAppUrl } from '@/lib/config/app-url';
import { sendSignupConfirmationEmail } from '@/lib/email/send-signup-confirmation';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserType } from '@/types';

type SignupMetadata = {
  user_type: UserType;
  full_name?: string;
  wants_trial?: boolean;
};

type SignupWithResendParams = {
  email: string;
  password: string;
  fullName: string;
  userType: UserType;
  wantsTrial: boolean;
};

type SignupWithResendResult =
  | { ok: true; needsEmailConfirmation: true }
  | { ok: false; error: string };

function buildMetadata(params: SignupWithResendParams): SignupMetadata {
  return {
    user_type: params.userType,
    ...(params.fullName ? { full_name: params.fullName } : {}),
    ...(params.wantsTrial ? { wants_trial: true } : {}),
  };
}

function isDuplicateUserError(message: string): boolean {
  return /already|registered|exists|duplicate/i.test(message);
}

function isAlreadyConfirmedError(message: string): boolean {
  return /confirmed|verified/i.test(message);
}

async function generateConfirmationLink(
  email: string,
  password: string,
  metadata: SignupMetadata
): Promise<{ actionLink: string } | { error: string }> {
  const admin = createAdminClient();
  const redirectTo = `${getAppUrl()}/auth/callback`;

  const signupAttempt = await admin.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      redirectTo,
      data: metadata,
    },
  });

  if (!signupAttempt.error && signupAttempt.data.properties?.action_link) {
    return { actionLink: signupAttempt.data.properties.action_link };
  }

  const signupError = signupAttempt.error?.message ?? 'Could not generate signup link.';
  if (!isDuplicateUserError(signupError)) {
    return { error: signupError };
  }

  const inviteAttempt = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: metadata,
    },
  });

  if (!inviteAttempt.error && inviteAttempt.data.properties?.action_link) {
    return { actionLink: inviteAttempt.data.properties.action_link };
  }

  const inviteError = inviteAttempt.error?.message ?? signupError;
  if (isAlreadyConfirmedError(inviteError)) {
    return { error: 'An account with this email already exists. Try logging in instead.' };
  }

  return { error: inviteError };
}

/** Creates (or reuses) an auth user and emails a confirmation link via Resend — no Supabase SMTP. */
export async function signupWithResendConfirmation(
  params: SignupWithResendParams
): Promise<SignupWithResendResult> {
  const metadata = buildMetadata(params);

  const linkResult = await generateConfirmationLink(
    params.email,
    params.password,
    metadata
  );

  if ('error' in linkResult) {
    return { ok: false, error: linkResult.error };
  }

  const sendResult = await sendSignupConfirmationEmail({
    to: params.email,
    confirmUrl: linkResult.actionLink,
    fullName: params.fullName,
    userType: params.userType,
  });

  if (!sendResult.ok) {
    return { ok: false, error: sendResult.error };
  }

  return { ok: true, needsEmailConfirmation: true };
}
