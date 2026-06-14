export const isBetaTrialOnly = process.env.BETA_TRIAL_ONLY === 'true';

/** Site password for the staged beta; unset disables the gate. */
export const betaSitePassword = process.env.BETA_INVITE_CODE?.trim() || null;

export const BETA_ACCESS_COOKIE = 'bb_beta_access';

export function isBetaGateEnabled(): boolean {
  return Boolean(betaSitePassword);
}

export async function betaAccessToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`broadbase-beta:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hasValidBetaAccessCookie(
  cookieValue: string | undefined
): Promise<boolean> {
  if (!betaSitePassword || !cookieValue) return false;
  const expected = await betaAccessToken(betaSitePassword);
  return cookieValue === expected;
}

/** Safe internal redirect target after beta gate unlock. */
export function sanitizeBetaNextParam(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '/';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/';
  if (trimmed.includes('..')) return '/';
  if (trimmed.startsWith('/beta-access')) return '/';
  return trimmed;
}

export function isBetaGateExemptPath(pathname: string): boolean {
  if (pathname === '/beta-access') return true;
  if (pathname.startsWith('/auth/callback')) return true;
  if (pathname.startsWith('/api/webhooks/')) return true;
  if (pathname.startsWith('/api/cron/')) return true;
  return false;
}
