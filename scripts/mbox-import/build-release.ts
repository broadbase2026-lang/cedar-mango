import type { GenerativeModel } from '@google/generative-ai';
import type { ImportResult } from '@/lib/ai/parsers';
import { RELEASE_SUMMARY_MAX_CHARS } from '@/lib/ai/parsers';
import {
  bytesToBase64,
  generateImportFromPdf,
  generateImportFromTextPrompt,
} from '@/lib/migration/release-import-core';
import { decodeHtmlCharacterReferences } from '@/lib/rich-text/decode-html-entities';
import { linkifyRichTextHtml } from '@/lib/rich-text/linkify';
import { richTextToPlainText, sanitizeRichTextHtml } from '@/lib/rich-text/sanitize';
import { apTitleCase } from '@/lib/utils/apTitleCase';
import type { ExtractedMessage, ParsedAttachment } from './extract-message';

export type ExtractionStrategy = 'direct_html' | 'gemini_text' | 'gemini_pdf';

export type BuiltRelease = {
  title: string;
  summary: string | null;
  body: string;
  industry_vertical: ImportResult['industry_vertical'];
  tags: string[];
  strategy: ExtractionStrategy;
  usedGemini: boolean;
};

const MIN_HTML_PLAIN_CHARS = 100;

export function chooseExtractionStrategy(msg: ExtractedMessage): ExtractionStrategy | null {
  const htmlPlain = msg.html
    ? richTextToPlainText(msg.html).trim().length
    : 0;
  if (htmlPlain > MIN_HTML_PLAIN_CHARS) {
    return 'direct_html';
  }

  const pdf = largestPdfAttachment(msg.attachments);
  if (pdf) {
    return 'gemini_pdf';
  }

  const text = (msg.text ?? '').trim();
  if (text.length > 0) {
    return 'gemini_text';
  }

  return null;
}

export function largestPdfAttachment(
  attachments: ParsedAttachment[]
): ParsedAttachment | null {
  const pdfs = attachments.filter(
    (a) =>
      a.contentType === 'application/pdf' ||
      a.fileName.toLowerCase().endsWith('.pdf')
  );
  if (pdfs.length === 0) return null;
  return pdfs.reduce((best, cur) => (cur.size > best.size ? cur : best));
}

function buildDirectFromHtml(msg: ExtractedMessage): BuiltRelease {
  const subjectDecoded = decodeHtmlCharacterReferences(msg.subject.trim());
  const title = apTitleCase(subjectDecoded) || 'Untitled press release';
  const body = sanitizeRichTextHtml(
    linkifyRichTextHtml(decodeHtmlCharacterReferences(msg.html ?? ''))
  ).trim();
  const plain = richTextToPlainText(body).trim();
  const summary =
    plain.length > 0
      ? plain.slice(0, RELEASE_SUMMARY_MAX_CHARS).trim()
      : null;

  return {
    title,
    summary,
    body: body || '<p></p>',
    industry_vertical: null,
    tags: [],
    strategy: 'direct_html',
    usedGemini: false,
  };
}

function mapImportResult(
  result: ImportResult,
  strategy: ExtractionStrategy
): BuiltRelease {
  return {
    title: result.title,
    summary: result.summary,
    body: result.bodyHtml,
    industry_vertical: result.industry_vertical,
    tags: result.tags,
    strategy,
    usedGemini: true,
  };
}

export async function buildReleaseFromMessage(
  msg: ExtractedMessage,
  model: GenerativeModel | null
): Promise<BuiltRelease | null> {
  const strategy = chooseExtractionStrategy(msg);
  if (!strategy) return null;

  if (strategy === 'direct_html') {
    return buildDirectFromHtml(msg);
  }

  if (!model) {
    throw new Error('GEMINI_API_KEY is required for plain-text and PDF messages.');
  }

  if (strategy === 'gemini_pdf') {
    const pdf = largestPdfAttachment(msg.attachments);
    if (!pdf) return null;
    const base64 = bytesToBase64(new Uint8Array(pdf.content));
    const result = await generateImportFromPdf(model, base64);
    return mapImportResult(result, 'gemini_pdf');
  }

  const text = (msg.text ?? '').trim();
  const prompt = [
    'Document is provided as plain text below (from an email).',
    'Extract and normalize it into the required JSON fields.',
    `Email subject (for context): ${msg.subject}`,
    '',
    'DOC_TEXT_START',
    text.length > 500_000 ? text.slice(0, 500_000) : text,
    'DOC_TEXT_END',
  ].join('\n');
  const result = await generateImportFromTextPrompt(model, prompt);
  return mapImportResult(result, 'gemini_text');
}
