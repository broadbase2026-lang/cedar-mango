import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import type { PressReleaseReadinessResult } from '@/lib/ai/types';

function stripCodeFences(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith('```')) return s;
  return s.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim();
}

function safeJsonSubstring(raw: string): string {
  const s = stripCodeFences(raw);
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return s.trim();
  return s.slice(start, end + 1).trim();
}

function parseJsonObjectLoose(raw: string): unknown {
  const candidates = [stripCodeFences(raw).trim(), safeJsonSubstring(raw)].filter(
    Boolean
  );

  let lastErr: unknown = null;
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch (e) {
      lastErr = e;
    }
    try {
      const repaired = jsonrepair(c);
      return JSON.parse(repaired);
    } catch (e) {
      lastErr = e;
    }
  }

  const msg =
    lastErr instanceof Error ? lastErr.message : 'Invalid JSON from model.';
  throw new Error(`Model returned invalid JSON. ${msg}`);
}

const pressReleaseReadinessSchema = z
  .object({
    score: z.number(),
    summary: z.string(),
    suggestions: z.array(z.string()),
  })
  .strict();

export function parsePressReleaseReadinessJson(
  raw: string
): PressReleaseReadinessResult {
  const obj = parseJsonObjectLoose(raw);
  const parsed = pressReleaseReadinessSchema.parse(obj);

  const clampedScore = Math.max(0, Math.min(100, Math.round(parsed.score)));
  const summary = parsed.summary.trim();
  const suggestions = parsed.suggestions
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!summary) {
    throw new Error('Model returned missing summary.');
  }
  if (suggestions.length === 0) {
    throw new Error('Model returned missing suggestions.');
  }

  return { score: clampedScore, summary, suggestions };
}

const importResultSchema = z
  .object({
    title: z.string().optional(),
    summary: z.string().nullable().optional(),
    bodyHtml: z.string().optional(),
    bodyHtmlBase64: z.string().optional(),
    industry_vertical: z
      .enum(['fnb', 'travel', 'culture', 'fashion', 'lifestyle', 'other'])
      .nullable()
      .optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const title = (v.title ?? '').trim();
    const body = (v.bodyHtml ?? '').trim();
    const bodyB64 = (v.bodyHtmlBase64 ?? '').trim();
    if (!title && !body && !bodyB64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected at least one of title, bodyHtml, or bodyHtmlBase64.',
      });
    }
    if (body && bodyB64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide bodyHtml OR bodyHtmlBase64, not both.',
      });
    }
  });

export type ImportResult = {
  title: string;
  summary: string | null;
  bodyHtml: string;
  industry_vertical:
    | 'fnb'
    | 'travel'
    | 'culture'
    | 'fashion'
    | 'lifestyle'
    | 'other'
    | null;
  tags: string[];
};

export function parsePressReleaseImportJson(raw: string): {
  title: string;
  summary: string | null;
  bodyHtmlRaw: string;
  industry_vertical:
    | 'fnb'
    | 'travel'
    | 'culture'
    | 'fashion'
    | 'lifestyle'
    | 'other'
    | null;
  tags: string[];
} {
  const obj = parseJsonObjectLoose(raw);
  const parsed = importResultSchema.parse(obj);

  const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
  const bodyHtmlRaw =
    typeof parsed.bodyHtml === 'string'
      ? parsed.bodyHtml
      : typeof parsed.bodyHtmlBase64 === 'string'
        ? Buffer.from(parsed.bodyHtmlBase64, 'base64').toString('utf8')
        : '';

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim()
      : null;

  return {
    title,
    summary,
    bodyHtmlRaw,
    industry_vertical: parsed.industry_vertical ?? null,
    tags,
  };
}

export const RELEASE_SUMMARY_MAX_CHARS = 280;

const releaseShortSummarySchema = z
  .object({
    summary: z.string(),
  })
  .strict();

/** Strip trailing ellipsis the model sometimes adds when over the limit. */
function stripTrailingEllipsis(s: string): string {
  // Avoid the `u` regex flag so this works even when TS target is < ES6.
  return s.replace(/\s*(?:…|\.{3})\s*$/, '').trim();
}

/**
 * Fit an over-length summary without appending "…". Prefer the last full sentence
 * within the limit; otherwise trim at the last word boundary.
 */
export function fitReleaseSummaryToMaxLength(
  raw: string,
  max = RELEASE_SUMMARY_MAX_CHARS
): string {
  let s = stripTrailingEllipsis(raw.trim().replace(/\s+/g, ' '));
  if (s.length <= max) return s;

  const slice = s.slice(0, max);
  let lastSentenceEnd = -1;
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    const next = slice[i + 1];
    if (next === undefined || next === ' ') {
      lastSentenceEnd = i + 1;
    }
  }

  const minKeep = Math.min(80, Math.floor(max * 0.35));
  if (lastSentenceEnd >= minKeep) {
    return slice.slice(0, lastSentenceEnd).trimEnd();
  }

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace >= minKeep) {
    return slice.slice(0, lastSpace).trimEnd();
  }

  return slice.trimEnd();
}

export function parseReleaseShortSummaryJson(raw: string): string {
  const obj = parseJsonObjectLoose(raw);
  const parsed = releaseShortSummarySchema.parse(obj);
  return fitReleaseSummaryToMaxLength(parsed.summary.trim());
}

