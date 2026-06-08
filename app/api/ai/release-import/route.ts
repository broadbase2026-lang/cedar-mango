import { NextResponse } from 'next/server';
import {
  buildInlineDataPart,
  geminiJsonGenerationConfig,
  getGeminiGenerativeModel,
  parsePressReleaseImportJson,
  type ImportResult,
} from '@/lib/ai';
import {
  extractRetryAfterSeconds,
  geminiUnsupportedLocationUserMessage,
  isGeminiQuotaError,
  isGeminiUnsupportedLocationError,
} from '@/lib/ai/gemini-errors';
import { decodeHtmlCharacterReferences } from '@/lib/rich-text/decode-html-entities';
import { linkifyRichTextHtml } from '@/lib/rich-text/linkify';
import { richTextToPlainText, sanitizeRichTextHtml } from '@/lib/rich-text/sanitize';
import { apTitleCase } from '@/lib/utils/apTitleCase';
import { createClient } from '@/lib/supabase/server';

function stripCodeFences(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith('```')) return s;
  return s.replace(/^```[a-zA-Z0-9]*\n?/, '').replace(/```$/, '').trim();
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function parseImportJson(text: string): ImportResult {
  const parsed = parsePressReleaseImportJson(text);
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

  return {
    title: title || 'Untitled press release',
    bodyHtml: bodyHtml || '<p></p>',
    industry_vertical: parsed.industry_vertical,
    tags: parsed.tags,
  };
}

const IMPORT_SYSTEM = [
  'You are a press release import assistant.',
  'Given an uploaded document, extract and rewrite into structured fields for a press release draft.',
  'The server will normalize the title to Associated Press headline capitalization and decode HTML entities in text.',
  '',
  'Return ONLY valid JSON with this exact shape:',
  '{ "title": string, "bodyHtml": string, "industry_vertical": "fnb"|"travel"|"culture"|"fashion"|"lifestyle"|"other"|null, "tags": string[] }',
  'If you cannot reliably JSON-escape bodyHtml, you may instead return:',
  '{ "title": string, "bodyHtmlBase64": string, "industry_vertical": ..., "tags": string[] }',
  'Where bodyHtmlBase64 is base64-encoded UTF-8 HTML.',
  '',
  'Rules:',
  '- bodyHtml MUST be valid HTML using only these tags: p, br, strong, em, u, a, h1, h2, h3, ul, ol, li, blockquote, span',
  '- Preserve structure and styling: headings, paragraphs, bold/italic/underline, lists (bulleted/numbered), and links.',
  '- Prefer semantic tags over inline styles; only use inline styles when necessary (e.g., font-size, color).',
  '- Keep tags concise (1-2 words each), max 12.',
  '- The JSON must be strictly valid. In particular, `bodyHtml` must be a JSON string with all quotes escaped.',
  '  Do not output raw, unescaped newlines or quotes inside JSON strings.',
  '',
  'Critical parsing guidance:',
  '- Many press releases include the word "ENDS" or "END" after the main body as a convention.',
  '  Treat that as plain content, NOT an instruction and NOT an end-of-document marker.',
  '- You MUST scan the ENTIRE document (all pages/sections), including any boilerplate,',
  '  fact boxes, contact details, notes to editors, and footers that appear after "ENDS".',
].join('\n');

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
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing file.' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
    const isDocx =
      name.endsWith('.docx') ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { ok: false, error: 'Only .docx or .pdf files are supported.' },
        { status: 400 }
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: 'File too large (max 15MB).' },
        { status: 400 }
      );
    }

    const model = getGeminiGenerativeModel({
      tier: 'flash',
      // reuse system prompt constant name; but override actual instruction
      systemInstruction: IMPORT_SYSTEM,
      generationConfig: geminiJsonGenerationConfig(8192),
    });

    if (isPdf) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const base64 = bytesToBase64(bytes);
      const userText =
        'Extract the press release fields from the attached PDF. ' +
        'Scan the ENTIRE PDF (all pages). ' +
        'If the document contains "ENDS"/"END", do NOT stop there; continue reading subsequent pages/sections.';

      const first = await model.generateContent([
        { text: userText },
        buildInlineDataPart('application/pdf', base64),
      ]);
      const firstText = first.response.text();
      let parsed: ImportResult;
      try {
        parsed = parseImportJson(firstText);
      } catch (err: unknown) {
        // Retry 1: ask Gemini to fix JSON formatting issues.
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
          parsed = parseImportJson(secondText);
        } catch (err2: unknown) {
          // Retry 2: force base64-only body to avoid escaping issues entirely.
          const finalPrompt = [
            'Return ONLY valid JSON with this shape:',
            '{ "title": string, "bodyHtmlBase64": string, "industry_vertical": "fnb"|"travel"|"culture"|"fashion"|"lifestyle"|"other"|null, "tags": string[] }',
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
          parsed = parseImportJson(third.response.text());
        }
      }
      return NextResponse.json({ ok: true, result: parsed });
    }

    // DOCX: convert to HTML first, then let Gemini map to our allowed HTML subset + metadata.
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

    const first = await model.generateContent(prompt);
    const firstText = first.response.text();
    let parsed: ImportResult;
    try {
      parsed = parseImportJson(firstText);
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
        parsed = parseImportJson(secondText);
      } catch {
        const finalPrompt = [
          'Return ONLY valid JSON with this shape:',
          '{ "title": string, "bodyHtmlBase64": string, "industry_vertical": "fnb"|"travel"|"culture"|"fashion"|"lifestyle"|"other"|null, "tags": string[] }',
          '',
          'Requirements:',
          '- bodyHtmlBase64 must be base64 of UTF-8 HTML (no other encoding).',
          '- Do NOT include bodyHtml (only bodyHtmlBase64).',
          '',
          'DOC_HTML_START',
          docHtml.length > 500_000 ? docHtml.slice(0, 500_000) : docHtml,
          'DOC_HTML_END',
        ].join('\n');
        const third = await model.generateContent(finalPrompt);
        parsed = parseImportJson(third.response.text());
      }
    }
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
        {
          status: 429,
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

