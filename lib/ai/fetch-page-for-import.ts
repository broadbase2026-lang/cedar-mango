import 'server-only';

import { assertSafeFetchTarget, validateSafeFetchUrl } from '@/lib/safe-fetch-url';

export { isBlockedHostname } from '@/lib/safe-fetch-url';

const MAX_PAGE_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 15_000;

async function readResponseTextLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    return (await res.text()).slice(0, MAX_PAGE_BYTES);
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_PAGE_BYTES) {
      await reader.cancel();
      throw new Error('Page is too large to import (max 1.5MB).');
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

const MAX_REDIRECTS = 5;

/**
 * Fetch with manual redirect handling so every hop's hostname is
 * re-validated against the SSRF blocklist. `redirect: 'follow'` would
 * let a benign public URL bounce to an internal address (e.g. cloud
 * metadata), so we resolve hops ourselves.
 */
async function fetchFollowingSafeRedirects(
  startUrl: URL,
  signal: AbortSignal
): Promise<Response> {
  let current = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertSafeFetchTarget(current);

    const res = await fetch(current.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'BroadbasePressImport/1.0 (+https://broadbase.app)',
      },
    });

    const isRedirect = res.status >= 300 && res.status < 400;
    if (!isRedirect) return res;

    const location = res.headers.get('location');
    if (!location) return res;
    current = await validateSafeFetchUrl(new URL(location, current).toString());
  }
  throw new Error('Too many redirects while fetching page.');
}

/** Fetch HTML from a public page for Gemini press-release import. */
export async function fetchPageHtmlForImport(
  rawUrl: string
): Promise<{ url: string; html: string }> {
  const url = await validateSafeFetchUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetchFollowingSafeRedirects(url, controller.signal);

    if (!res.ok) {
      throw new Error(`Could not fetch page (HTTP ${res.status}).`);
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType && !contentType.includes('text/html') && !contentType.includes('text/plain')) {
      throw new Error('URL must point to an HTML page.');
    }

    const html = await readResponseTextLimited(res);
    if (!html.trim()) {
      throw new Error('Page returned empty content.');
    }

    return { url: url.toString(), html };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Timed out fetching page. Try again or use a faster host.');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
