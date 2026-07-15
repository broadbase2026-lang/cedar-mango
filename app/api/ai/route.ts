import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  geminiJsonGenerationConfig,
  getGeminiGenerativeModel,
  PRESS_RELEASE_AI_READINESS_SYSTEM,
  parsePressReleaseReadinessJson,
  type PressReleaseReadinessResult,
} from '@/lib/ai';
import { assertBrandAiAccess } from '@/lib/ai/brand-access';
import {
  extractRetryAfterSeconds,
  geminiUnsupportedLocationUserMessage,
  isGeminiQuotaError,
  isGeminiUnsupportedLocationError,
} from '@/lib/ai/gemini-errors';
import { aiRateLimitMessage, enforceAiRateLimit } from '@/lib/ai/rate-limit';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';
import { calculateGeoReadinessScore } from '@/lib/utils/geoScore';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ERROR_MESSAGES } from '@/constants/copy';

const READINESS_HOURLY_LIMIT = 30;

async function persistReadinessScores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pressReleaseId: string,
  aiScore: number,
  geoScore: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const full = await supabase
    .from('press_releases')
    .update({
      ai_readiness_score: aiScore,
      geo_readiness_score: geoScore,
    })
    .eq('id', pressReleaseId)
    .is('deleted_at', null);

  if (!full.error) {
    return { ok: true };
  }

  const msg = full.error.message ?? '';
  const geoColumnMissing =
    msg.includes('geo_readiness_score') ||
    full.error.code === '42703' ||
    full.error.code === 'PGRST204';

  if (!geoColumnMissing) {
    return { ok: false, message: msg };
  }

  const aiOnly = await supabase
    .from('press_releases')
    .update({ ai_readiness_score: aiScore })
    .eq('id', pressReleaseId)
    .is('deleted_at', null);

  if (aiOnly.error) {
    return { ok: false, message: aiOnly.error.message };
  }

  return { ok: true };
}

export async function OPTIONS() {
  // Avoid default 405s on preflight requests.
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, GET, OPTIONS' },
  });
}

export async function GET() {
  // Ensure Solo users see the expected 403 rather than a 405 when they hit this URL directly.
  const access = await assertBrandAiAccess();
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
  }
  return NextResponse.json(
    { ok: false, error: 'Method not allowed. Use POST.' },
    { status: 405, headers: { Allow: 'POST, GET, OPTIONS' } }
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { pressReleaseId?: unknown };
    const pressReleaseId = String(body.pressReleaseId ?? '').trim();
    if (!pressReleaseId) {
      return NextResponse.json(
        { ok: false, error: 'Missing pressReleaseId.' },
        { status: 400 }
      );
    }

    const access = await assertBrandAiAccess();
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    try {
      const admin = createAdminClient();
      const rl = await enforceAiRateLimit(
        admin,
        access.userId,
        'ai-readiness',
        READINESS_HOURLY_LIMIT
      );
      if (!rl.allowed) {
        return NextResponse.json(
          { ok: false, error: aiRateLimitMessage(READINESS_HOURLY_LIMIT) },
          { status: 429 }
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured.' },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    const releaseRes = await supabase
      .from('press_releases')
      .select('id, brand_id, title, summary, body, tags, industry_vertical, status')
      .eq('id', pressReleaseId)
      .is('deleted_at', null)
      .maybeSingle();

    if (releaseRes.error) {
      return NextResponse.json(
        { ok: false, error: releaseRes.error.message },
        { status: 500 }
      );
    }
    if (!releaseRes.data) {
      return NextResponse.json(
        { ok: false, error: 'Press release not found.' },
        { status: 404 }
      );
    }

    const pr = releaseRes.data;
    if (pr.status !== 'draft' && pr.status !== 'archived') {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI Readiness scoring is only available for draft and archived releases.',
        },
        { status: 400 }
      );
    }

    const bodyText = richTextToPlainText(pr.body ?? '');
    if (!bodyText) {
      return NextResponse.json(
        { ok: false, error: 'Draft is missing body text.' },
        { status: 400 }
      );
    }

    // Guard: prevent extremely long bodies from crossing high-context pricing boundary.
    if (bodyText.length > 400_000) {
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.bodyTooLongForAi },
        { status: 400 }
      );
    }

    const model = getGeminiGenerativeModel({
      tier: 'flash',
      systemInstruction: PRESS_RELEASE_AI_READINESS_SYSTEM,
      generationConfig: geminiJsonGenerationConfig(8192),
    });

    const prompt = [
      'Return ONLY valid JSON with this shape:',
      '{ "score": number, "summary": string, "suggestions": string[] }',
      '',
      'Score 0–100. Summary: 1–3 sentences. Suggestions: 3–6 concise bullet items.',
      '',
      'Press release draft:',
      `Title: ${pr.title}`,
      pr.summary ? `Summary: ${pr.summary}` : 'Summary: (none)',
      pr.industry_vertical ? `Vertical: ${pr.industry_vertical}` : 'Vertical: (none)',
      Array.isArray(pr.tags) && pr.tags.length > 0
        ? `Tags: ${pr.tags.join(', ')}`
        : 'Tags: (none)',
      '',
      bodyText.length > 10_000
        ? `Body (truncated):\n${bodyText.slice(0, 10_000)}`
        : `Body:\n${bodyText}`,
    ].join('\n');

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const readiness: PressReleaseReadinessResult = parsePressReleaseReadinessJson(text);

    // GEO readiness sub-score. Hero asset (first WHERE is_hero = true, may be
    // null) and brand website come from separate reads; the score itself is
    // written in the same update call as ai_readiness_score below.
    const heroRes = await supabase
      .from('press_assets')
      .select('caption')
      .eq('press_release_id', pressReleaseId)
      .eq('is_hero', true)
      .is('deleted_at', null)
      .maybeSingle();

    const brandRes = pr.brand_id
      ? await supabase
          .from('brands')
          .select('website')
          .eq('id', pr.brand_id)
          .maybeSingle()
      : null;

    const tags = Array.isArray(pr.tags)
      ? pr.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];

    const geo = calculateGeoReadinessScore({
      title: pr.title,
      summary: pr.summary,
      body: bodyText,
      tags,
      heroAsset: heroRes.data ? { caption: heroRes.data.caption } : null,
      brandWebsite: brandRes?.data?.website ?? null,
    });

    const persist = await persistReadinessScores(
      supabase,
      pressReleaseId,
      readiness.score,
      geo.score
    );

    if (!persist.ok) {
      return NextResponse.json(
        { ok: false, error: persist.message },
        { status: 500 }
      );
    }

    revalidatePath('/brand/dashboard');
    revalidatePath('/brand/releases/new');

    return NextResponse.json({ ok: true, result: readiness });
  } catch (e: unknown) {
    const rawMessage =
      (e instanceof Error ? e.message : null) ?? 'AI Readiness scoring failed.';

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
