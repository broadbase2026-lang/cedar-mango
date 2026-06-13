import { describe, expect, test } from 'vitest';
import { stripEmbeddedMediaFromHtml } from '@/lib/rich-text/strip-embedded-media';

describe('stripEmbeddedMediaFromHtml', () => {
  test('removes img tags with data-uri src', () => {
    const html =
      '<p>Caption</p><img alt="cover" src="data:image/png;base64,iVBORw0KGgo=" />';
    expect(stripEmbeddedMediaFromHtml(html)).toBe('<p>Caption</p>');
  });

  test('removes large base64 blobs left as raw text', () => {
    const blob = 'data:image/png;base64,' + 'A'.repeat(500);
    expect(stripEmbeddedMediaFromHtml(`<p>${blob}</p>`)).toBe('<p></p>');
  });

  test('preserves normal links and text', () => {
    const html = '<p>Hello <a href="https://example.com">world</a></p>';
    expect(stripEmbeddedMediaFromHtml(html)).toBe(html);
  });
});
