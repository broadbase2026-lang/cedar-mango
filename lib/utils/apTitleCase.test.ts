import { describe, expect, test } from 'vitest';
import { apTitleCase } from '@/lib/utils/apTitleCase';

describe('apTitleCase', () => {
  test('capitalizes major words and lowers small words', () => {
    expect(apTitleCase('the lord of the rings')).toBe('The Lord of the Rings');
  });

  test('handles headline all caps', () => {
    expect(apTitleCase('NEW YORK CITY OPENS FIRST PARK')).toBe(
      'New York City Opens First Park'
    );
  });

  test('hyphenated compounds', () => {
    expect(apTitleCase('LONG-TERM PLAN FOR THE CITY')).toBe('Long-Term Plan for the City');
  });
});
