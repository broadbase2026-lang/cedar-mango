/**
 * Server-side reachability check for an article URL.
 * Issues a HEAD request that is aborted at exactly 5 seconds so a
 * slow remote host can never block the route handler indefinitely.
 * Returns true only on a 2xx response.
 */
export async function verifyUrlReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
