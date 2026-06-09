import 'server-only';

import {
  fitReleaseSummaryToMaxLength,
  parsePressReleaseImportJson,
  type ImportResult,
} from '@/lib/ai/parsers';
import { decodeHtmlCharacterReferences } from '@/lib/rich-text/decode-html-entities';
import { linkifyRichTextHtml } from '@/lib/rich-text/linkify';
import { richTextToPlainText, sanitizeRichTextHtml } from '@/lib/rich-text/sanitize';
import { apTitleCase } from '@/lib/utils/apTitleCase';

export function normalizeReleaseImportResult(rawModelText: string): ImportResult {
  const parsed = parsePressReleaseImportJson(rawModelText);
  const titleDecoded = decodeHtmlCharacterReferences(parsed.title.trim());
  const title = titleDecoded
    ? apTitleCase(titleDecoded)
    : 'Untitled press release';

  const bodyRawDecoded = decodeHtmlCharacterReferences(parsed.bodyHtmlRaw);
  const bodyHtml = sanitizeRichTextHtml(
    linkifyRichTextHtml(bodyRawDecoded)
  ).trim();

  const bodyPlain = richTextToPlainText(bodyHtml || '').trim();
  if (!parsed.title.trim() && !bodyPlain) {
    throw new Error('Model returned empty title/body.');
  }

  const summaryRaw =
    typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const summary = summaryRaw
    ? fitReleaseSummaryToMaxLength(summaryRaw)
    : null;

  return {
    title: title || 'Untitled press release',
    summary,
    bodyHtml: bodyHtml || '<p></p>',
    industry_vertical: parsed.industry_vertical,
    tags: parsed.tags,
  };
}
