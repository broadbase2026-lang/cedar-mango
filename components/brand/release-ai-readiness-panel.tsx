'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PressReleaseReadinessResult } from '@/lib/ai';
import { TIER_FEATURES } from '@/constants/copy';

type ReleaseAiReadinessPanelProps = {
  releaseId: string;
  initialScore: number | null;
  plan: string | null;
};

async function readJsonSafely(res: Response): Promise<any> {
  const ct = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
  return { __nonJson: true, __text: text };
}

function critiqueForScore(score: number | null): string[] {
  if (score == null) {
    return [
      'Connect Gemini to generate a tailored readiness score for this draft.',
      'Upload vertical hero assets so editors can preview stories quickly.',
      'Keep headlines under 60 characters for stronger search visibility.',
    ];
  }
  const base: string[] = [];
  if (score < 85) {
    base.push('Missing high-res vertical images for Instagram Stories formats.');
  }
  if (score < 75) {
    base.push('Headline may exceed 60 characters — tighten for search snippets.');
  }
  if (score < 65) {
    base.push('Add a concise 2–3 sentence summary for AI indexing and digests.');
  }
  if (base.length === 0) {
    base.push('Strong structure — schedule publish after final proofread pass.');
  }
  return base;
}

export function ReleaseAiReadinessPanel({
  releaseId,
  initialScore,
  plan,
}: ReleaseAiReadinessPanelProps) {
  const router = useRouter();
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<PressReleaseReadinessResult | null>(
    null
  );

  const score = initialScore;
  const critiques = critiqueForScore(aiResult?.score ?? score);
  const showSuggestions =
    plan === 'pro' ||
    plan === 'agency' ||
    (plan != null &&
      plan in TIER_FEATURES &&
      (TIER_FEATURES as any)[plan]?.aiReadinessSuggestions === true);

  async function onGenerateAiReadiness() {
    if (!releaseId) return;
    setAiPending(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pressReleaseId: releaseId }),
      });
      const json = (await readJsonSafely(res)) as
        | { ok: true; result: PressReleaseReadinessResult }
        | { ok: false; error: string; retryAfterSeconds?: number | null }
        | { __nonJson: true; __text: string }
        | null;

      if (json && typeof json === 'object' && '__nonJson' in json) {
        setAiResult(null);
        setAiError(
          res.status === 401
            ? 'You must be signed in to use AI readiness.'
            : `AI request failed (non-JSON response, status ${res.status}).`
        );
        return;
      }
      if (!json) {
        setAiResult(null);
        setAiError(`AI request failed (invalid JSON, status ${res.status}).`);
        return;
      }
      if (!res.ok || !json || json.ok !== true) {
        if (res.status === 429) {
          const retry =
            typeof (json as any)?.retryAfterSeconds === 'number'
              ? Math.max(1, Math.round((json as any).retryAfterSeconds))
              : null;
          setAiError(
            retry
              ? `AI quota exceeded. Retry in ~${retry}s (or enable billing for Gemini).`
              : 'AI quota exceeded (enable billing for Gemini or retry shortly).'
          );
          setAiResult(null);
          return;
        }
        setAiResult(null);
        setAiError(
          'error' in json && typeof json.error === 'string'
            ? json.error
            : `AI request failed (${res.status}).`
        );
        return;
      }
      setAiResult(json.result);
      router.refresh();
    } catch (e: any) {
      setAiResult(null);
      setAiError(e?.message ?? 'AI request failed.');
    } finally {
      setAiPending(false);
    }
  }

  const displayScore = aiResult?.score ?? score;

  return (
    <aside className="bb-dash-ai-panel">
      <div className="bb-dash-ai-card">
        <h3 className="bb-dash-section-title">AI readiness</h3>
        <p className="bb-dash-ai-desc">
          Generate a Gemini-powered score for this draft and get actionable
          suggestions. Scoring uses your last saved version.
        </p>

        <div className="mt-6">
          <div className="bb-dash-score-row">
            <span>Score meter</span>
            <span className="bb-dash-score-num">
              {displayScore != null ? `${displayScore}/100` : '—'}
            </span>
          </div>
          <div className="bb-dash-meter-track">
            <div
              className="bb-dash-meter-fill"
              style={{
                width: `${
                  displayScore != null
                    ? Math.min(100, Math.max(0, displayScore))
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="bb-dash-critique-title">Critique</div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="bb-btn-primary-sm"
              disabled={aiPending}
              onClick={onGenerateAiReadiness}
            >
              {aiPending ? 'Generating…' : 'Generate score'}
            </button>
            {aiError && (
              <span className="bb-dash-muted-p" role="status">
                {aiError}
              </span>
            )}
          </div>

          {aiResult?.summary && (
            <p className="bb-dash-muted-p mt-4">{aiResult.summary}</p>
          )}
          {showSuggestions ? (
            <ul className="bb-dash-critique-list">
              {(aiResult?.suggestions?.length
                ? aiResult.suggestions
                : critiques
              ).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
              <div className="font-medium">Improvement suggestions locked</div>
              <div className="mt-1 text-neutral-700">
                Upgrade to Growth to unlock improvement suggestions.
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
