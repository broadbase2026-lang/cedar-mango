const DEFAULT_APP_URL = 'https://broadbase.app';

/** Absolute site origin without a trailing slash. */
export function appBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
  return raw.replace(/\/+$/, '');
}
