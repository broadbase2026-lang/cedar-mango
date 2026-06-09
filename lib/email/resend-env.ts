import 'server-only';

export type ResendEnv = {
  apiKey: string;
  fromEmail: string;
};

/** Returns Resend credentials when signup/transactional email is configured. */
export function getResendEnv(): ResendEnv | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) return null;
  return { apiKey, fromEmail };
}

export function resendNotConfiguredMessage(): string {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY?.trim()) missing.push('RESEND_API_KEY');
  if (!process.env.RESEND_FROM_EMAIL?.trim()) missing.push('RESEND_FROM_EMAIL');
  return `Email is not configured on the server (${missing.join(', ')}). Set both in Vercel env vars.`;
}
