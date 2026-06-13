import type { GenerativeModel } from '@google/generative-ai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  fitReleaseSummaryToMaxLength,
  parsePressReleaseImportJson,
  type ImportResult,
} from '@/lib/ai/parsers';
import {
  geminiJsonGenerationConfig,
  getGeminiApiKey,
  resolveGeminiModelId,
} from '@/lib/ai/config';
import { buildInlineDataPart } from '@/lib/ai/multimodal';
import { RELEASE_IMPORT_SYSTEM } from '@/lib/ai/release-import-prompt';
import { decodeHtmlCharacterReferences } from '@/lib/rich-text/decode-html-entities';
import { linkifyRichTextHtml } from '@/lib/rich-text/linkify';
import { stripEmbeddedMediaFromHtml } from '@/lib/rich-text/strip-embedded-media';
import { richTextToPlainText, sanitizeRichTextHtml } from '@/lib/rich-text/sanitize';
import { apTitleCase } from '@/lib/utils/apTitleCase';

export function stripCodeFences(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith('```')) return s;
  return s.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim();
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function normalizeReleaseImportResult(rawModelText: string): ImportResult {
  const parsed = parsePressReleaseImportJson(rawModelText);
  const titleDecoded = decodeHtmlCharacterReferences(parsed.title.trim());
  const title = titleDecoded
    ? apTitleCase(titleDecoded)
    : 'Untitled press release';

  const bodyRawDecoded = decodeHtmlCharacterReferences(parsed.bodyHtmlRaw);
  const bodyHtml = sanitizeRichTextHtml(
    linkifyRichTextHtml(stripEmbeddedMediaFromHtml(bodyRawDecoded))
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

export function createReleaseImportModel(): GenerativeModel {
  const apiKey = getGeminiApiKey();
  if (!apiKey?.trim()) {
    throw new Error('GEMINI_API_KEY is not set. Add it to the server environment.');
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: resolveGeminiModelId('flash'),
    systemInstruction: RELEASE_IMPORT_SYSTEM,
    generationConfig: geminiJsonGenerationConfig(8192),
  });
}

export async function generateImportFromTextPrompt(
  model: GenerativeModel,
  prompt: string
): Promise<ImportResult> {
  const first = await model.generateContent(prompt);
  const firstText = first.response.text();
  try {
    return normalizeReleaseImportResult(firstText);
  } catch (err: unknown) {
    const retryPrompt = [
      'Your previous response was invalid JSON and could not be parsed.',
      `Parse error: ${String(err instanceof Error ? err.message : err)}`,
      '',
      'Return ONLY corrected, strictly valid JSON for the same document.',
      'Do not add commentary.',
      'Do not include images, img tags, or data: URIs in bodyHtml.',
      'If bodyHtml escaping is difficult, return bodyHtmlBase64 instead.',
      '',
      'Previous response (for reference):',
      stripCodeFences(firstText).slice(0, 20_000),
    ].join('\n');
    const second = await model.generateContent(retryPrompt);
    const secondText = second.response.text();
    try {
      return normalizeReleaseImportResult(secondText);
    } catch {
      const finalPrompt = [
        'Return ONLY valid JSON with this shape:',
        '{ "title": string, "summary": string|null, "bodyHtmlBase64": string, "industry_vertical": "fnb"|"travel"|"culture"|"fashion"|"lifestyle"|"other"|null, "tags": string[] }',
        '',
        'Requirements:',
        '- bodyHtmlBase64 must be base64 of UTF-8 HTML (no other encoding).',
        '- Do NOT include bodyHtml (only bodyHtmlBase64).',
        '- Do NOT include images, img tags, or data: URIs in the HTML.',
        '',
        prompt.slice(0, 500_000),
      ].join('\n');
      const third = await model.generateContent(finalPrompt);
      return normalizeReleaseImportResult(third.response.text());
    }
  }
}

export async function generateImportFromPdf(
  model: GenerativeModel,
  base64: string
): Promise<ImportResult> {
  const userText =
    'Extract the press release fields from the attached PDF. ' +
    'Scan the ENTIRE PDF (all pages). ' +
    'If the document contains "ENDS"/"END", do NOT stop there; continue reading subsequent pages/sections.';

  const first = await model.generateContent([
    { text: userText },
    buildInlineDataPart('application/pdf', base64),
  ]);
  const firstText = first.response.text();
  try {
    return normalizeReleaseImportResult(firstText);
  } catch (err: unknown) {
    const retryPrompt = [
      'Your previous response was invalid JSON and could not be parsed.',
      `Parse error: ${String(err instanceof Error ? err.message : err)}`,
      '',
      'Return ONLY corrected, strictly valid JSON for the same document.',
      'Do not add commentary.',
      'Do not include images, img tags, or data: URIs in bodyHtml.',
      'If bodyHtml escaping is difficult, return bodyHtmlBase64 instead.',
      '',
      'Previous response (for reference):',
      stripCodeFences(firstText).slice(0, 20_000),
    ].join('\n');
    const second = await model.generateContent([
      { text: retryPrompt },
      buildInlineDataPart('application/pdf', base64),
    ]);
    const secondText = second.response.text();
    try {
      return normalizeReleaseImportResult(secondText);
    } catch {
      const finalPrompt = [
        'Return ONLY valid JSON with this shape:',
        '{ "title": string, "summary": string|null, "bodyHtmlBase64": string, "industry_vertical": "fnb"|"travel"|"culture"|"fashion"|"lifestyle"|"other"|null, "tags": string[] }',
        '',
        'Requirements:',
        '- bodyHtmlBase64 must be base64 of UTF-8 HTML (no other encoding).',
        '- Do NOT include bodyHtml (only bodyHtmlBase64).',
        '- Do NOT include images, img tags, or data: URIs in the HTML.',
        '- Scan the ENTIRE PDF (all pages). Ignore "ENDS"/"END" as a stop marker.',
      ].join('\n');
      const third = await model.generateContent([
        { text: finalPrompt },
        buildInlineDataPart('application/pdf', base64),
      ]);
      return normalizeReleaseImportResult(third.response.text());
    }
  }
}
