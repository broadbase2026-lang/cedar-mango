import { validateSafeFetchUrl } from '@/lib/safe-fetch-url';

async function probeUrl(
  parsed: URL,
  method: 'HEAD' | 'GET',
  signal: AbortSignal
): Promise<Response> {
  return fetch(parsed.toString(), {
    method,
    redirect: 'manual',
    signal,
    headers:
      method === 'GET'
        ? { Range: 'bytes=0-0', Accept: 'text/html,application/xhtml+xml,*/*' }
        : undefined,
  });
}

function responseReachable(res: Response): boolean {
  if (res.status >= 300 && res.status < 400) return true;
  return res.ok;
}

/**
 * Server-side reachability check for an article URL.
 * Tries HEAD first, then a bounded GET when HEAD is blocked (common on news sites).
 * Returns true only on a 2xx response or redirect.
 */
export async function verifyUrlReachable(url: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = await validateSafeFetchUrl(url);
  } catch {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const head = await probeUrl(parsed, 'HEAD', controller.signal);
    if (responseReachable(head)) return true;

    const get = await probeUrl(parsed, 'GET', controller.signal);
    return responseReachable(get);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
