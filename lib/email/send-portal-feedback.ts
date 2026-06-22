import 'server-only';

import { Resend } from 'resend';
import { APP_NAME } from '@/constants/copy';
import { escapeHtml } from '@/lib/email/escape-html';
import { getResendEnv, resendNotConfiguredMessage } from '@/lib/email/resend-env';

export const PORTAL_FEEDBACK_INBOX = 'help@broadbase.app';

type SendPortalFeedbackParams = {
  portal: 'brand' | 'journalist';
  message: string;
  userEmail: string;
  userName: string | null;
  contextLabel?: string | null;
};

export async function sendPortalFeedbackEmail(
  params: SendPortalFeedbackParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const env = getResendEnv();
  if (!env) {
    return { ok: false, error: resendNotConfiguredMessage() };
  }

  const portalLabel = params.portal === 'brand' ? 'Brand' : 'Journalist';
  const name = params.userName?.trim() || 'Unknown user';
  const context = params.contextLabel?.trim() || null;
  const subject = context
    ? `${APP_NAME} ${portalLabel} feedback — ${context}`
    : `${APP_NAME} ${portalLabel} feedback`;

  const text = [
    `Portal: ${portalLabel}`,
    `From: ${name} <${params.userEmail}>`,
    context ? `Workspace: ${context}` : null,
    '',
    params.message.trim(),
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = `
    <p><strong>Portal:</strong> ${escapeHtml(portalLabel)}</p>
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(params.userEmail)}&gt;</p>
    ${context ? `<p><strong>Workspace:</strong> ${escapeHtml(context)}</p>` : ''}
    <hr />
    <p style="white-space:pre-wrap">${escapeHtml(params.message.trim())}</p>
  `.trim();

  const resend = new Resend(env.apiKey);
  const { error } = await resend.emails.send({
    from: env.fromEmail,
    to: PORTAL_FEEDBACK_INBOX,
    replyTo: params.userEmail,
    subject,
    html,
    text,
  });

  if (error) {
    console.error('[email] sendPortalFeedback failed', error);
    return {
      ok: false,
      error: 'We could not send your feedback right now. Please try again shortly.',
    };
  }

  return { ok: true };
}
