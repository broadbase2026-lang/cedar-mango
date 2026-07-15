import 'server-only';

import type { LookupAddress } from 'node:dns';
import dns from 'node:dns/promises';
import { getAppUrl } from '@/lib/config/app-url';

function isBlockedIpv4(h: string): boolean {
  const ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/.exec(h);
  if (!ipv4) return false;

  const parts = h.split('.').map((n) => Number(n));
  if (parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  if (parts[0] === 0) return true; // "this" network
  if (parts[0] === 10) return true; // private
  if (parts[0] === 127) return true; // loopback
  if (parts[0] === 169 && parts[1] === 254) return true; // link-local / cloud metadata
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
  const mapped = /(?:::ffff:|::)((?:\d{1,3}\.){3}\d{1,3})$/i.exec(addr);
  if (mapped && isBlockedIpv4(mapped[1])) return true;
  const first = addr.split(':')[0]?.toLowerCase() ?? '';
  if (/^f[cd]/.test(first)) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(first)) return true; // link-local fe80::/10
  return false;
}

/** True when hostname is a private, loopback, link-local, or metadata address. */
export function isBlockedHostname(hostname: string): boolean {
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

function isIpLiteralHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h) return false;
  if (h.includes(':')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  if (/^\d+$/.test(h)) return true; // decimal-encoded IPv4
  return false;
}

function appHostname(): string | null {
  try {
    const host = new URL(getAppUrl()).hostname.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

function isAppCustomDomain(hostname: string): boolean {
  const appHost = appHostname();
  if (!appHost) return false;
  const h = hostname.toLowerCase();
  return h === appHost || h.endsWith(`.${appHost}`);
}

/**
 * Host must be a public domain name or this deployment's custom app domain.
 * Literal IP hostnames are never allowed (even when the address is "public").
 */
export function isAllowedFetchHostname(hostname: string): boolean {
  if (isBlockedHostname(hostname)) return false;
  if (isIpLiteralHostname(hostname)) return false;
  if (isAppCustomDomain(hostname)) return true;
  // Require a multi-label public hostname (e.g. example.com, news.site.co.uk).
  return hostname.includes('.');
}

function urlNotAllowedError(): Error {
  return new Error('That URL is not allowed.');
}

/** Parse and apply hostname policy (sync). Does not resolve DNS. */
export function parseSafeFetchUrl(raw: string): URL {
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
  if (!isAllowedFetchHostname(url.hostname)) {
    throw urlNotAllowedError();
  }

  return url;
}

/** Reject hostnames that resolve to private/internal addresses (DNS rebinding). */
export async function assertSafeFetchTarget(url: URL): Promise<void> {
  let records: LookupAddress[];
  try {
    records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw urlNotAllowedError();
  }

  if (records.length === 0) {
    throw urlNotAllowedError();
  }

  for (const { address } of records) {
    if (isBlockedHostname(address)) {
      throw urlNotAllowedError();
    }
  }
}

/** Parse, validate hostname policy, and confirm DNS resolves to public addresses. */
export async function validateSafeFetchUrl(raw: string): Promise<URL> {
  const url = parseSafeFetchUrl(raw);
  await assertSafeFetchTarget(url);
  return url;
}
