import { isBlockedHostname } from '@/lib/ai/fetch-page-for-import';

/**
 * Server-side reachability check for an article URL.
 * Issues a HEAD request that is aborted at exactly 5 seconds so a
 * slow remote host can never block the route handler indefinitely.
 * Returns true only on a 2xx response.
 *
 * Rejects non-http(s) schemes and internal/private hosts so this
 * cannot be used to probe internal services (SSRF).
 */
export async function verifyUrlReachable(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  if (parsed.username || parsed.password) {
    return false;
  }
  if (isBlockedHostname(parsed.hostname)) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(parsed.toString(), {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    // A redirect is treated as reachable without following it, so the
    // check can't be bounced to an internal host.
    if (res.status >= 300 && res.status < 400) return true;
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
