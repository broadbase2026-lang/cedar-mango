import { NextResponse } from 'next/server';
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
import { RELEASE_IMPORT_SYSTEM } from '@/lib/ai/release-import-prompt';
import { stripEmbeddedMediaFromHtml } from '@/lib/rich-text/strip-embedded-media';
import { classifyReleaseImportFile } from '@/lib/brand/release-import-files';
import {
  bytesToBase64,
  generateImportFromPdf,
  generateImportFromTextPrompt,
} from '@/lib/migration/release-import-core';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiRateLimitMessage, enforceAiRateLimit } from '@/lib/ai/rate-limit';

const IMPORT_HOURLY_LIMIT = 15;

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
    }

    try {
      const admin = createAdminClient();
      const rl = await enforceAiRateLimit(
        admin,
        user.id,
        'release-import',
        IMPORT_HOURLY_LIMIT
      );
      if (!rl.allowed) {
        return NextResponse.json(
          { ok: false, error: aiRateLimitMessage(IMPORT_HOURLY_LIMIT) },
          { status: 429 }
        );
      }
    } catch {
      // Admin client unavailable — proceed without throttling (fail open).
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
      const pageHtml = stripEmbeddedMediaFromHtml(html);
      const prompt = [
        `Source URL: ${url}`,
        'The page HTML is provided below. Extract press release fields from the main article content.',
        'Embedded images have been removed; do not recreate or reference them in bodyHtml.',
        '',
        'PAGE_HTML_START',
        pageHtml.length > 500_000 ? pageHtml.slice(0, 500_000) : pageHtml,
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
          convertImage: mammoth.images.imgElement(async (image) => {
            const alt = image.altText?.trim();
            return alt ? { alt } : {};
          }),
        }
      );
      const docHtml = stripEmbeddedMediaFromHtml(converted.value || '');
      const prompt = [
        'Document is provided as HTML below (converted from .docx).',
        'Extract and normalize it into the required JSON fields.',
        'Inline images were stripped from the source; do not recreate or reference them in bodyHtml.',
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
        ? (() => {
            const docHtml = stripEmbeddedMediaFromHtml(rawText);
            return [
              'Document is provided as HTML below.',
              'Extract and normalize it into the required JSON fields.',
              'Embedded images have been removed; do not recreate or reference them in bodyHtml.',
              '',
              'DOC_HTML_START',
              docHtml.length > 500_000 ? docHtml.slice(0, 500_000) : docHtml,
              'DOC_HTML_END',
            ].join('\n');
          })()
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
