import { describe, expect, test } from 'vitest';
import {
  fitReleaseSummaryToMaxLength,
  parsePressReleaseImportJson,
  parsePressReleaseReadinessJson,
  parseReleaseShortSummaryJson,
} from '@/lib/ai/parsers';

describe('parsePressReleaseReadinessJson', () => {
  test('parses and clamps score + trims text', () => {
    const raw = '```json\n{ "score": 101.2, "summary": "  ok  ", "suggestions": [" a ", ""] }\n```';
    expect(parsePressReleaseReadinessJson(raw)).toEqual({
      score: 100,
      summary: 'ok',
      suggestions: ['a'],
    });
  });
});

describe('parsePressReleaseImportJson', () => {
  test('accepts bodyHtml', () => {
    const raw = '{ "title": "  T  ", "bodyHtml": "<p>Hello</p>", "industry_vertical": "travel", "tags": [" foo ", ""] }';
    expect(parsePressReleaseImportJson(raw)).toEqual({
      title: 'T',
      bodyHtmlRaw: '<p>Hello</p>',
      industry_vertical: 'travel',
      tags: ['foo'],
    });
  });

  test('accepts bodyHtmlBase64', () => {
    const html = '<p>Hi</p>';
    const b64 = Buffer.from(html, 'utf8').toString('base64');
    const raw = `{ "title": "X", "bodyHtmlBase64": "${b64}", "industry_vertical": null, "tags": [] }`;
    expect(parsePressReleaseImportJson(raw)).toEqual({
      title: 'X',
      bodyHtmlRaw: html,
      industry_vertical: null,
      tags: [],
    });
  });
});

describe('parseReleaseShortSummaryJson', () => {
  test('parses summary string', () => {
    const raw = '{ "summary": "  A short line.  " }';
    expect(parseReleaseShortSummaryJson(raw)).toBe('A short line.');
  });
});

describe('fitReleaseSummaryToMaxLength', () => {
  test('strips trailing ellipsis from model output', () => {
    expect(fitReleaseSummaryToMaxLength('Done well…')).toBe('Done well');
    expect(fitReleaseSummaryToMaxLength('Done well...')).toBe('Done well');
  });

  test('keeps last full sentence when over limit without adding ellipsis', () => {
    const long =
      'Acme opens a flagship in Singapore with sustainable dining and a rooftop bar. ' +
      'The property targets lifestyle travelers across APAC with curated experiences and local partnerships.';
    const fitted = fitReleaseSummaryToMaxLength(long, 120);
    expect(fitted.length).toBeLessThanOrEqual(120);
    expect(fitted.endsWith('.')).toBe(true);
    expect(fitted).not.toContain('…');
    expect(fitted).toMatch(/rooftop bar\.$/);
  });
});
