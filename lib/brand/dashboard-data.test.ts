import { describe, expect, test } from 'vitest';
import { parseDashboardReleaseSearchTerms } from '@/lib/brand/dashboard-data';

describe('parseDashboardReleaseSearchTerms', () => {
  test('returns empty for blank input', () => {
    expect(parseDashboardReleaseSearchTerms(undefined)).toEqual([]);
    expect(parseDashboardReleaseSearchTerms('   ')).toEqual([]);
  });

  test('splits on whitespace and keeps multiple terms', () => {
    expect(parseDashboardReleaseSearchTerms('hotel  tokyo')).toEqual([
      'hotel',
      'tokyo',
    ]);
  });

  test('strips ILIKE and PostgREST metacharacters', () => {
    expect(parseDashboardReleaseSearchTerms('50% off (sale)')).toEqual([
      '50',
      'off',
      'sale',
    ]);
  });
});
