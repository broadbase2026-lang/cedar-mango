import { NextResponse } from 'next/server';
import type { GenerativeModel } from '@google/generative-ai';
import {
  buildInlineDataPart,
  geminiJsonGenerationConfig,
  getGeminiGenerativeModel,
} from '@/lib/ai';
import { fetchPageHtmlForImport } from '@/lib/ai/fetch-page-for-import';
import {
  extractRetryAfterSeconds,
  geminiUnsupportedLocationUserMessage,
  isGeminiQuotaError,
  isGeminiUnsupportedLocationError,
} from '@/lib/ai/gemini-errors';
import { normalizeReleaseImportResult } from '@/lib/ai/release-import-normalize';
import { RELEASE_IMPORT_SYSTEM } from '@/lib/ai/release-import-prompt';
import { classifyReleaseImportFile } from '@/lib/brand/release-import-files';
import { createClient } from '@/lib/supabase/server';

function stripCodeFences(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith('```')) return s;
  return s.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim();
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

async function generateImportFromTextPrompt(
  model: GenerativeModel,
  prompt: string
) {
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
        '',
        prompt.slice(0, 500_000),
      ].join('\n');
      const third = await model.generateContent(finalPrompt);
      return normalizeReleaseImportResult(third.response.text());
    }
  }
}

async function generateImportFromPdf(
  model: GenerativeModel,
  base64: string
) {
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

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const urlRaw = String(form.get('url') ?? '').trim();

    const model = getGeminiGenerativeModel({
      tier: 'flash',
      systemInstruction: RELEASE_IMPORT_SYSTEM,
      generationConfig: geminiJsonGenerationConfig(8192),
    });

    if (urlRaw) {
      const { url, html } = await fetchPageHtmlForImport(urlRaw);
      const prompt = [
        `Source URL: ${url}`,
        'The page HTML is provided below. Extract press release fields from the main article content.',
        '',
        'PAGE_HTML_START',
        html.length > 500_000 ? html.slice(0, 500_000) : html,
        'PAGE_HTML_END',
      ].join('\n');
      const parsed = await generateImportFromTextPrompt(model, prompt);
      return NextResponse.json({ ok: true, result: parsed });
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Provide a press release file or a page URL.' },
        { status: 400 }
      );
    }

    const kind = classifyReleaseImportFile(file);
    if (!kind) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Supported formats: PDF, Word (.docx), plain text (.txt), or HTML (.html).',
        },
        { status: 400 }
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'File too large (max 15MB).' },
        { status: 400 }
      );
    }

    if (kind === 'pdf') {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const base64 = bytesToBase64(bytes);
      const parsed = await generateImportFromPdf(model, base64);
      return NextResponse.json({ ok: true, result: parsed });
    }

    if (kind === 'docx') {
      const buf = Buffer.from(await file.arrayBuffer());
      const mammoth = await import('mammoth');
      const converted = await mammoth.convertToHtml(
        { buffer: buf },
        {
          includeDefaultStyleMap: true,
        }
      );
      const docHtml = converted.value || '';
      const prompt = [
        'Document is provided as HTML below (converted from .docx).',
        'Extract and normalize it into the required JSON fields.',
        '',
        'DOC_HTML_START',
        docHtml.length > 500_000 ? docHtml.slice(0, 500_000) : docHtml,
        'DOC_HTML_END',
      ].join('\n');

      const parsed = await generateImportFromTextPrompt(model, prompt);
      return NextResponse.json({ ok: true, result: parsed });
    }

    const rawText = await file.text();
    const prompt =
      kind === 'html'
        ? [
            'Document is provided as HTML below.',
            'Extract and normalize it into the required JSON fields.',
            '',
            'DOC_HTML_START',
            rawText.length > 500_000 ? rawText.slice(0, 500_000) : rawText,
            'DOC_HTML_END',
          ].join('\n')
        : [
            'Document is provided as plain text below.',
            'Extract and normalize it into the required JSON fields.',
            '',
            'DOC_TEXT_START',
            rawText.length > 500_000 ? rawText.slice(0, 500_000) : rawText,
            'DOC_TEXT_END',
          ].join('\n');

    const parsed = await generateImportFromTextPrompt(model, prompt);
    return NextResponse.json({ ok: true, result: parsed });
  } catch (e: unknown) {
    const rawMessage =
      (e instanceof Error ? e.message : null) ?? 'Import failed.';

    if (isGeminiUnsupportedLocationError(rawMessage)) {
      return NextResponse.json(
        { ok: false, error: geminiUnsupportedLocationUserMessage() },
        { status: 403 }
      );
    }

    if (isGeminiQuotaError(rawMessage)) {
      const retryAfter = extractRetryAfterSeconds(rawMessage);
      const short =
        'Gemini quota exceeded for this API key/project. Enable billing / upgrade your plan, or retry shortly.';
      return NextResponse.json(
        { ok: false, error: short, retryAfterSeconds: retryAfter },
        { status: 429,
          headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
        }
      );
    }

    const message =
      e instanceof Error && e.name === 'GeminiConfigurationError'
        ? 'Gemini is not configured (set GEMINI_API_KEY).'
        : rawMessage;
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
