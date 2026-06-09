import 'server-only';

import { Resend } from 'resend';
import { APP_NAME } from '@/constants/copy';
import { getResendEnv, resendNotConfiguredMessage } from '@/lib/email/resend-env';
import type { UserType } from '@/types';

type SendSignupConfirmationParams = {
  to: string;
  confirmUrl: string;
  fullName: string;
  userType: UserType;
};

export async function sendSignupConfirmationEmail(
  params: SendSignupConfirmationParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const env = getResendEnv();
  if (!env) {
    return { ok: false, error: resendNotConfiguredMessage() };
  }

  const name = params.fullName.trim() || 'there';
  const roleLabel = params.userType === 'journalist' ? 'journalist' : 'brand';
  const subject = `Confirm your ${APP_NAME} account`;

  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thanks for signing up for ${APP_NAME} as a ${roleLabel}. Confirm your email to finish creating your account:</p>
    <p><a href="${escapeHtml(params.confirmUrl)}">Confirm email address</a></p>
    <p>If you did not create this account, you can ignore this email.</p>
  `.trim();

  const text = [
    `Hi ${name},`,
    '',
    `Thanks for signing up for ${APP_NAME} as a ${roleLabel}. Confirm your email to finish creating your account:`,
    params.confirmUrl,
    '',
    'If you did not create this account, you can ignore this email.',
  ].join('\n');

  const resend = new Resend(env.apiKey);
  const { error } = await resend.emails.send({
    from: env.fromEmail,
    to: params.to,
    subject,
    html,
    text,
  });

  if (error) {
    console.error('[email] sendSignupConfirmation failed', error);
    return {
      ok: false,
      error: 'We could not send the confirmation email. Check RESEND_FROM_EMAIL uses a verified domain.',
    };
  }

  return { ok: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
