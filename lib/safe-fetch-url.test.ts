import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LookupAddress } from 'node:dns';
import dns from 'node:dns/promises';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/config/app-url', () => ({
  getAppUrl: () => 'https://broadbase.app',
}));

import {
  isAllowedFetchHostname,
  isBlockedHostname,
  parseSafeFetchUrl,
  validateSafeFetchUrl,
} from '@/lib/safe-fetch-url';

describe('isBlockedHostname', () => {
  it('blocks loopback and metadata-style hosts', () => {
    expect(isBlockedHostname('127.0.0.1')).toBe(true);
    expect(isBlockedHostname('localhost')).toBe(true);
    expect(isBlockedHostname('169.254.169.254')).toBe(true);
    expect(isBlockedHostname('metadata.google.internal')).toBe(true);
  });
});

describe('isAllowedFetchHostname', () => {
  it('allows public domains and the app custom domain', () => {
    expect(isAllowedFetchHostname('example.com')).toBe(true);
    expect(isAllowedFetchHostname('news.example.co.uk')).toBe(true);
    expect(isAllowedFetchHostname('broadbase.app')).toBe(true);
    expect(isAllowedFetchHostname('preview.broadbase.app')).toBe(true);
  });

  it('blocks internal hosts and literal IPs', () => {
    expect(isAllowedFetchHostname('127.0.0.1')).toBe(false);
    expect(isAllowedFetchHostname('10.0.0.1')).toBe(false);
    expect(isAllowedFetchHostname('192.168.1.1')).toBe(false);
    expect(isAllowedFetchHostname('8.8.8.8')).toBe(false);
    expect(isAllowedFetchHostname('internal')).toBe(false);
    expect(isAllowedFetchHostname('host.local')).toBe(false);
  });
});

describe('parseSafeFetchUrl', () => {
  it('parses valid public URLs', () => {
    const url = parseSafeFetchUrl('https://example.com/press');
    expect(url.hostname).toBe('example.com');
  });

  it('rejects blocked hosts', () => {
    expect(() => parseSafeFetchUrl('http://127.0.0.1/')).toThrow('not allowed');
    expect(() => parseSafeFetchUrl('http://localhost/')).toThrow('not allowed');
  });
});

describe('validateSafeFetchUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects domains that resolve to private addresses', async () => {
    vi.spyOn(dns, 'lookup').mockImplementation(
      async () => [{ address: '127.0.0.1', family: 4 }] as LookupAddress[]
    );

    await expect(validateSafeFetchUrl('https://evil.example/')).rejects.toThrow('not allowed');
  });

  it('accepts domains that resolve to public addresses', async () => {
    vi.spyOn(dns, 'lookup').mockImplementation(
      async () => [{ address: '93.184.216.34', family: 4 }] as LookupAddress[]
    );

    const url = await validateSafeFetchUrl('https://example.com/release');
    expect(url.hostname).toBe('example.com');
  });
});
