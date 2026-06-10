import { NextResponse } from 'next/server';
import {
  geminiJsonGenerationConfig,
  getGeminiGenerativeModel,
  parseReleaseShortSummaryJson,
  PRESS_RELEASE_SHORT_SUMMARY_SYSTEM,
  RELEASE_SUMMARY_MAX_CHARS,
} from '@/lib/ai';
import {
  extractRetryAfterSeconds,
  geminiUnsupportedLocationUserMessage,
  isGeminiQuotaError,
  isGeminiUnsupportedLocationError,
} from '@/lib/ai/gemini-errors';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { aiRateLimitMessage, enforceAiRateLimit } from '@/lib/ai/rate-limit';

const BODY_PLAIN_MAX = 14_000;
const SUMMARY_HOURLY_LIMIT = 30;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: unknown;
      bodyHtml?: unknown;
    };

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
        'release-summary',
        SUMMARY_HOURLY_LIMIT
      );
      if (!rl.allowed) {
        return NextResponse.json(
          { ok: false, error: aiRateLimitMessage(SUMMARY_HOURLY_LIMIT) },
          { status: 429 }
        );
      }
    } catch {
      // Admin client unavailable — proceed without throttling (fail open).
    }

    const title = String(body.title ?? '').trim();
    const bodyHtml = String(body.bodyHtml ?? '').trim();
    const plain = richTextToPlainText(bodyHtml);

    if (!title && !plain) {
      return NextResponse.json(
        { ok: false, error: 'Add a title or body text before generating a summary.' },
        { status: 400 }
      );
    }

    const plainForPrompt =
      plain.length > BODY_PLAIN_MAX ? `${plain.slice(0, BODY_PLAIN_MAX)}\n[…truncated]` : plain;

    const model = getGeminiGenerativeModel({
      tier: 'flash',
      systemInstruction: PRESS_RELEASE_SHORT_SUMMARY_SYSTEM,
      generationConfig: geminiJsonGenerationConfig(512),
    });

    const prompt = [
      'Return ONLY valid JSON with this shape:',
      '{ "summary": string }',
      '',
      `The summary must be 1–2 complete sentences, at most ${RELEASE_SUMMARY_MAX_CHARS} characters.`,
      'It must end with . ! or ? — never with an ellipsis. Do not exceed the character limit.',
      '',
      title ? `Title: ${title}` : 'Title: (none)',
      '',
      plainForPrompt ? `Body (plain text):\n${plainForPrompt}` : 'Body: (none)',
    ].join('\n');

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    const summary = parseReleaseShortSummaryJson(text);

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS' && summary.length < 40) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Summary was truncated by the model. Try again, or shorten the body before summarizing.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, summary });
  } catch (e: unknown) {
    const rawMessage = e instanceof Error ? e.message : 'Summary generation failed.';

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
