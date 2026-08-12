import { describe, expect, test } from 'vitest';
import { stripLeadingTitleFromHtml } from '@/lib/rich-text/strip-leading-title';

describe('stripLeadingTitleFromHtml', () => {
  test('strips matching leading h1', () => {
    const html = '<h1>Hello World</h1><p>Body copy.</p>';
    expect(stripLeadingTitleFromHtml(html, 'Hello World')).toBe('<p>Body copy.</p>');
  });

  test('strips matching leading paragraph', () => {
    const html = '<p>Hello World</p><p>Body copy.</p>';
    expect(stripLeadingTitleFromHtml(html, 'Hello World')).toBe('<p>Body copy.</p>');
  });

  test('leaves non-matching heading', () => {
    const html = '<h2>Other</h2><p>Body copy.</p>';
    expect(stripLeadingTitleFromHtml(html, 'Hello World')).toBe(html);
  });

  test('skips empty leading paragraphs before title', () => {
    const html = '<p></p><h1>Hello World</h1><p>Body copy.</p>';
    expect(stripLeadingTitleFromHtml(html, 'Hello World')).toBe('<p>Body copy.</p>');
  });
});
