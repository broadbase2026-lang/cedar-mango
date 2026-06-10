import 'server-only';

const MAX_PAGE_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 15_000;

function isBlockedIpv4(h: string): boolean {
  const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/.exec(h);
  if (!ipv4) return false;

  const parts = h.split('.').map((n) => Number(n));
  if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  if (parts[0] === 0) return true; // "this" network
  if (parts[0] === 10) return true; // private
  if (parts[0] === 127) return true; // loopback
  if (parts[0] === 169 && parts[1] === 254) return true; // link-local
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // private
  if (parts[0] === 192 && parts[1] === 168) return true; // private
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT (RFC 6598)
  if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true; // benchmarking
  if (parts[0] >= 224) return true; // multicast + reserved
  return false;
}

function isBlockedIpv6(h: string): boolean {
  if (!h.includes(':')) return false;
  const addr = h.split('%')[0]; // drop zone id
  if (addr === '::1' || addr === '::') return true;
  // IPv4-mapped / -compatible (e.g. ::ffff:169.254.169.254) — validate the embedded v4.
  const mapped = /(?:::ffff:|::)((?:\d{1,3}\.){3}\d{1,3})$/i.exec(addr);
  if (mapped && isBlockedIpv4(mapped[1])) return true;
  const first = addr.split(':')[0]?.toLowerCase() ?? '';
  // Unique local addresses fc00::/7 (fc/fd) and link-local fe80::/10 (fe8–feb).
  if (/^f[cd]/.test(first)) return true;
  if (/^fe[89ab]/.test(first)) return true;
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  if (h === '0.0.0.0') return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (h === 'metadata.google.internal') return true;

  if (isBlockedIpv4(h)) return true;
  if (isBlockedIpv6(h)) return true;
  return false;
}

export { isBlockedHostname };

export function normalizeImportPageUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('URL is required.');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid URL (include https://).');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }
  if (url.username || url.password) {
    throw new Error('URLs with credentials are not supported.');
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error('That URL is not allowed.');
  }

  return url;
}

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
    current = normalizeImportPageUrl(new URL(location, current).toString());
  }
  throw new Error('Too many redirects while fetching page.');
}

/** Fetch HTML from a public page for Gemini press-release import. */
export async function fetchPageHtmlForImport(
  rawUrl: string
): Promise<{ url: string; html: string }> {
  const url = normalizeImportPageUrl(rawUrl);
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
