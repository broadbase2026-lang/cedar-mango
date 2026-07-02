import type { CookieOptions } from '@supabase/ssr';

/** Marker cookie: when set, Supabase auth cookies are session-only (no maxAge). */
export const SESSION_ONLY_AUTH_COOKIE = 'bb-auth-session-only';

export function shouldUseSessionOnlyAuthCookies(
  getCookie: (name: string) => string | undefined
): boolean {
  return getCookie(SESSION_ONLY_AUTH_COOKIE) === '1';
}

export function sessionOnlyAuthCookieOptions(options: CookieOptions): CookieOptions {
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest;
}

export const SESSION_ONLY_MARKER_COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
};
