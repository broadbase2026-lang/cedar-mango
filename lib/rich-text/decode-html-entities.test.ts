import { describe, expect, test } from 'vitest';
import { decodeHtmlCharacterReferences } from '@/lib/rich-text/decode-html-entities';

describe('decodeHtmlCharacterReferences', () => {
  test('decodes ampersand and angle brackets', () => {
    expect(decodeHtmlCharacterReferences('AT&amp;T')).toBe('AT&T');
    expect(decodeHtmlCharacterReferences('&lt;&lt; shift &gt;&gt;')).toBe('<< shift >>');
  });

  test('decodes double-encoded sequences iteratively', () => {
    expect(decodeHtmlCharacterReferences('&amp;lt;&amp;lt;')).toBe('<<');
    expect(decodeHtmlCharacterReferences('&amp;amp;')).toBe('&');
  });

  test('decodes numeric references', () => {
    expect(decodeHtmlCharacterReferences('&#38;')).toBe('&');
    expect(decodeHtmlCharacterReferences('&#x26;')).toBe('&');
  });
});
