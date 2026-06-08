import crypto from 'crypto';

type SvixHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

function decodeSvixSecret(secret: string): Buffer {
  const raw = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
  return Buffer.from(raw, 'base64');
}

/**
 * Verify a Svix-signed webhook payload (used by Resend).
 * Returns false when headers, timestamp, or signature are invalid.
 */
export function verifySvixWebhook(
  payload: string,
  headers: SvixHeaders,
  secret: string,
  toleranceSeconds = 300
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) return false;

  const signedContent = `${id}.${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', decodeSvixSecret(secret))
    .update(signedContent)
    .digest('base64');

  for (const part of signature.split(' ')) {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) continue;
    try {
      const a = Buffer.from(value);
      const b = Buffer.from(expected);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}
