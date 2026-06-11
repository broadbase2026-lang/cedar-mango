import { NextResponse } from 'next/server';
import {
  geminiJsonGenerationConfig,
  getGeminiGenerativeModel,
  PRESS_RELEASE_AI_READINESS_SYSTEM,
  parsePressReleaseReadinessJson,
  type PressReleaseReadinessResult,
} from '@/lib/ai';
import {
  extractRetryAfterSeconds,
  geminiUnsupportedLocationUserMessage,
  isGeminiQuotaError,
  isGeminiUnsupportedLocationError,
} from '@/lib/ai/gemini-errors';
import { richTextToPlainText } from '@/lib/rich-text/sanitize';
import { calculateGeoReadinessScore } from '@/lib/utils/geoScore';
import { applyDevSubscriptionOverrides } from '@/lib/auth/dev-profile-mock';
import { createClient } from '@/lib/supabase/server';
import { ERROR_MESSAGES } from '@/constants/copy';
import { createAdminClient } from '@/lib/supabase/admin';

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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
    }

    // Plan gate: AI writing assistant is not available on Solo (starter).
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return NextResponse.json({ ok: false, error: 'Server misconfigured.' }, { status: 500 });
    }

    const { data: subRow } = await admin
      .from('subscriptions')
      .select('plan, status')
      .eq('owner_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    const sub = applyDevSubscriptionOverrides(user.id, subRow);
    const plan = sub?.plan as 'starter' | 'pro' | 'agency' | undefined;
    if (!plan) {
      return NextResponse.json(
        { ok: false, error: 'You need an active subscription to use AI.' },
        { status: 403 }
      );
    }
    if (plan === 'starter') {
      return NextResponse.json(
        { ok: false, error: ERROR_MESSAGES.aiNotAvailable },
        { status: 403 }
      );
    }

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
    if (pr.status !== 'draft') {
      return NextResponse.json(
        { ok: false, error: 'AI Readiness scoring is only available for drafts.' },
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

    const updateRes = await supabase
      .from('press_releases')
      .update({
        ai_readiness_score: readiness.score,
        geo_readiness_score: geo.score,
      })
      .eq('id', pressReleaseId)
      .is('deleted_at', null);

    if (updateRes.error) {
      return NextResponse.json(
        { ok: false, error: updateRes.error.message },
        { status: 500 }
      );
    }

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
