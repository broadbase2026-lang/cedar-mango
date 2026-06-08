'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLayoutEffect, useMemo, useState, useTransition } from 'react';
import {
  archiveRelease,
  softDeleteRelease,
  unpublishReleaseToDraft,
} from '@/app/dashboard/brand/actions';
import { ReleaseImportDropzone } from '@/components/brand/release-import-dropzone';
import type {
  BrandDashboardData,
  DraftSummary,
} from '@/lib/brand/dashboard-data';
import type { PressReleaseReadinessResult } from '@/lib/ai';
import { TIER_FEATURES } from '@/constants/copy';

type BrandDashboardViewProps = {
  hasBrand: boolean;
  data: BrandDashboardData;
  scrollToReleasesSection?: boolean;
  accessState: {
    hasActiveSubscription: boolean;
    isInTrial: boolean;
    trialExpired: boolean;
    plan: string | null;
  };
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

function formatInt(n: number) {
  return n.toLocaleString();
}

function MiniSparkline({ values }: { values: number[] }) {
  const w = 72;
  const h = 22;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const d = pts.join(' ');

  return (
    <svg
      width={w}
      height={h}
      className="bb-sparkline"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={d}
      />
    </svg>
  );
}

function statusBadgeClass(status: string) {
  if (status === 'embargoed') return 'bb-badge-embargoed';
  if (status === 'published') return 'bb-badge-published';
  if (status === 'draft') return 'bb-badge-draft';
  return 'bb-badge-archived';
}

function statusLabel(status: string) {
  if (status === 'embargoed') return 'Embargoed';
  if (status === 'published') return 'Published';
  if (status === 'draft') return 'Draft';
  return 'Archived';
}

function toDatetimeLocalValue(isoUtc: string): string {
  const d = new Date(isoUtc);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function minMaxEmbargo() {
  const min = new Date(Date.now() + 15 * 60 * 1000);
  const max = new Date(Date.now());
  max.setMonth(max.getMonth() + 12);
  return {
    min: min.toISOString().slice(0, 16),
    max: max.toISOString().slice(0, 16),
  };
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
    base.push(
      'Missing high-res vertical images for Instagram Stories formats.'
    );
  }
  if (score < 75) {
    base.push(
      'Headline may exceed 60 characters — tighten for search snippets.'
    );
  }
  if (score < 65) {
    base.push(
      'Add a concise 2–3 sentence summary for AI indexing and digests.'
    );
  }
  if (base.length === 0) {
    base.push(
      'Strong structure — schedule publish after final proofread pass.'
    );
  }
  return base;
}

export function BrandDashboardView({
  hasBrand,
  data,
  scrollToReleasesSection = false,
  accessState,
}: BrandDashboardViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<PressReleaseReadinessResult | null>(
    null
  );
  const canUseEmbargo = accessState.plan === 'pro' || accessState.plan === 'agency';
  const [embargoBusyId, setEmbargoBusyId] = useState<string | null>(null);
  const [embargoEdit, setEmbargoEdit] = useState<{
    id: string;
    value: string;
    min: string;
    max: string;
  } | null>(null);

  useLayoutEffect(() => {
    if (!scrollToReleasesSection) return;
    const el = document.getElementById('releases');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [scrollToReleasesSection]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(() =>
    data.drafts[0]?.id ?? null
  );

  const selectedDraft: DraftSummary | null = useMemo(() => {
    if (!selectedDraftId) return data.drafts[0] ?? null;
    return (
      data.drafts.find((d) => d.id === selectedDraftId) ?? data.drafts[0] ?? null
    );
  }, [data.drafts, selectedDraftId]);

  const score = selectedDraft?.aiReadinessScore ?? null;
  const critiques = critiqueForScore(score);
  const showSuggestions =
    accessState.plan === 'pro' ||
    accessState.plan === 'agency' ||
    (accessState.plan != null &&
      accessState.plan in TIER_FEATURES &&
      (TIER_FEATURES as any)[accessState.plan]?.aiReadinessSuggestions === true);

  const emptyNoBrand = !hasBrand;
  const emptyNoReleases = hasBrand && data.releases.length === 0;

  async function onGenerateAiReadiness() {
    if (!selectedDraft?.id) return;
    setAiPending(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pressReleaseId: selectedDraft.id }),
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
          ('error' in json && typeof json.error === 'string'
            ? json.error
            : `AI request failed (${res.status}).`)
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

  function onDelete(id: string, title: string) {
    if (
      !confirm(
        `Remove “${title}” from your vault? This uses soft-delete (hidden from newsroom).`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await softDeleteRelease(id);
      if (!res.ok) {
        alert(res.message);
        return;
      }
      router.refresh();
    });
  }

  function onUnpublish(id: string, title: string) {
    if (!confirm(`Move “${title}” back to draft?`)) {
      return;
    }
    startTransition(async () => {
      const res = await unpublishReleaseToDraft(id);
      if (!res.ok) {
        alert(res.message);
        return;
      }
      router.refresh();
    });
  }

  function onArchive(id: string, title: string) {
    if (!confirm(`Archive “${title}”? It will no longer appear in discovery.`)) {
      return;
    }
    startTransition(async () => {
      const res = await archiveRelease(id);
      if (!res.ok) {
        alert(res.message);
        return;
      }
      router.refresh();
    });
  }

  const trialBanner = accessState.isInTrial ? (
    <div
      className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      role="status"
    >
      <div className="font-medium">You’re on a 14-day free trial.</div>
      <div className="mt-1 text-emerald-900/80">
        You can publish 1 press release free. Upgrade any time to unlock unlimited publishing.
      </div>
    </div>
  ) : null;

  const expiredBanner =
    accessState.trialExpired && !accessState.hasActiveSubscription ? (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">
              Your free trial has ended. Upgrade to continue publishing press releases and adding brands.
            </div>
          </div>
          <Link
            href="/pricing"
            className="bb-btn-primary-sm no-underline"
          >
            See pricing
          </Link>
        </div>
      </div>
    ) : null;

  if (emptyNoBrand) {
    return (
      <main className="bb-dash-empty">
        <div className="bb-dash-empty-nobrand-inner">
          {trialBanner}
          {expiredBanner}
          <div className="bb-dash-empty-icon">
            <span className="bb-dash-empty-icon-glyph" aria-hidden>
              ◇
            </span>
          </div>
          <h2 className="bb-dash-empty-heading">Finish setting up your brand</h2>
          <p className="bb-dash-empty-text">
            Add your brand profile to unlock the vault, journalist analytics, and
            draft readiness scoring — everything stays scoped to your account.
          </p>
          <Link
            href="/brand/settings"
            className="bb-dash-empty-cta bb-btn-primary-sm no-underline"
          >
            Brand settings
          </Link>
        </div>
      </main>
    );
  }

  if (emptyNoReleases) {
    return (
      <main className="bb-dash-empty">
        <div className="bb-dash-empty-releases-wrap">
          <div className="bb-dash-empty-releases-frame">
            <div className="bb-dash-empty-releases-inner">
              {trialBanner}
              {expiredBanner}
              <div className="bb-dash-empty-releases-icon" aria-hidden>
                ✦
              </div>
              <h2 className="bb-dash-empty-releases-heading">
                Your vault is ready
              </h2>
              <p className="bb-dash-empty-text">
                Upload your first release to appear in journalist discovery.
                You&apos;ll see views, downloads, and engagement here as editors
                interact with your content.
              </p>
              <Link
                href="/brand/releases/new"
                className="bb-dash-empty-cta bb-btn-primary-sm no-underline"
              >
                Create your first release
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        {trialBanner}
        {expiredBanner}
        <div className="bb-dash-eyebrow">
          <div>
            <h2 className="bb-dash-section-title">At a glance</h2>
            <p className="bb-dash-section-desc">
              Measurable engagement across your releases
            </p>
          </div>
        </div>

        <div className="bb-dash-metrics-grid">
          {[
            {
              label: 'Total views',
              value: formatInt(data.metrics.totalViews),
              hint: 'Views logged when journalists open your releases',
            },
            {
              label: 'Asset downloads',
              value: formatInt(data.metrics.assetDownloads),
              hint: 'High-resolution assets saved by editors',
            },
            {
              label: 'Active journalists',
              value: formatInt(data.metrics.activeJournalists),
              hint: 'Unique demand-side users this month',
            },
            {
              label: 'AI readiness avg',
              value:
                data.metrics.aiReadinessAvg != null
                  ? `${data.metrics.aiReadinessAvg}`
                  : '—',
              hint: 'Mean score across drafts with scores',
            },
          ].map((card) => (
            <div key={card.label} className="bb-dash-metric-card">
              <div className="bb-dash-metric-label">{card.label}</div>
              <div className="bb-dash-metric-value">{card.value}</div>
              <div className="bb-dash-metric-hint">{card.hint}</div>
            </div>
          ))}
        </div>

        <div className="bb-dash-split">
          <section id="releases">
            <div className="mb-4">
              <ReleaseImportDropzone />
            </div>
            <div className="bb-dash-releases-top">
              <div>
                <h2 className="bb-dash-section-title">Release management</h2>
                <p className="bb-dash-section-desc">
                  Recent uploads for your organization
                </p>
              </div>
              <Link href="/brand/releases/new" className="bb-dash-link">
                New release
              </Link>
            </div>

            <div className="bb-dash-table-shell">
              <div className="bb-dash-table-scroll">
                <table className="bb-dash-table">
                  <thead className="bb-dash-thead">
                    <tr>
                      <th className="bb-dash-th">Title</th>
                      <th className="bb-dash-th">Status</th>
                      <th className="bb-dash-th">Vertical</th>
                      <th className="bb-dash-th">Engagement</th>
                      <th className="bb-dash-th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bb-dash-tbody">
                    {data.releases.map((row) => (
                      <tr key={row.id} className="bb-dash-tr">
                        <td className="bb-dash-td-title">
                          <span className="bb-dash-title-clamp">{row.title}</span>
                        </td>
                        <td className="bb-dash-td-muted">
                          {(() => {
                            const embargoActive =
                              row.status === 'published' &&
                              row.embargoUntil &&
                              new Date(row.embargoUntil) > new Date();
                            const s = embargoActive ? 'embargoed' : row.status;
                            return (
                              <div className="flex flex-col gap-1">
                                <span className={statusBadgeClass(s)}>
                                  {statusLabel(s)}
                                </span>
                                {embargoActive ? (
                                  <span className="text-xs text-brand-muted">
                                    Lifts:{' '}
                                    {new Date(row.embargoUntil!).toLocaleString(undefined, {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="bb-dash-td-muted">
                          {row.verticalLabel}
                        </td>
                        <td className="bb-dash-td-muted">
                          <div className="bb-dash-engagement">
                            <MiniSparkline values={row.sparkline} />
                            <span className="bb-dash-engagement-label">
                              {formatInt(row.viewsCount)} views
                            </span>
                          </div>
                        </td>
                        <td className="bb-dash-td-actions">
                          <div className="bb-dash-action-row">
                            {row.status !== 'published' ? (
                              <Link
                                href={`/brand/releases/new?edit=${encodeURIComponent(row.id)}`}
                                className="bb-dash-link-sm"
                              >
                                Edit
                              </Link>
                            ) : null}
                            <Link href="/brand/analytics" className="bb-dash-link-sm">
                              View analytics
                            </Link>
                            {row.status === 'published' && (
                              <>
                                {row.embargoUntil &&
                                new Date(row.embargoUntil) > new Date() ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={pending || embargoBusyId === row.id}
                                      className="bb-dash-link-sm"
                                      onClick={() => {
                                        if (
                                          !confirm(
                                            'Lift embargo? This release will become publicly visible immediately.'
                                          )
                                        ) {
                                          return;
                                        }
                                        void (async () => {
                                          setEmbargoBusyId(row.id);
                                          try {
                                            const res = await fetch(
                                              `/api/releases/${row.id}/embargo`,
                                              {
                                                method: 'PATCH',
                                                headers: { 'content-type': 'application/json' },
                                                body: JSON.stringify({ embargo_until: null }),
                                              }
                                            );
                                            const j = (await readJsonSafely(res)) as any;
                                            if (!res.ok || !j || j.success !== true) {
                                              alert(
                                                j && typeof j.error === 'string'
                                                  ? j.error
                                                  : `Failed (${res.status}).`
                                              );
                                              return;
                                            }
                                            router.refresh();
                                          } finally {
                                            setEmbargoBusyId(null);
                                          }
                                        })();
                                      }}
                                    >
                                      Lift embargo
                                    </button>
                                    <button
                                      type="button"
                                      disabled={pending || embargoBusyId === row.id}
                                      className="bb-dash-link-sm"
                                      onClick={() => {
                                        const { min, max } = minMaxEmbargo();
                                        setEmbargoEdit({
                                          id: row.id,
                                          value: row.embargoUntil
                                            ? toDatetimeLocalValue(row.embargoUntil)
                                            : '',
                                          min,
                                          max,
                                        });
                                      }}
                                    >
                                      Edit embargo
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => onUnpublish(row.id, row.title)}
                                  className="bb-dash-link-sm"
                                >
                                  Unpublish
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => onArchive(row.id, row.title)}
                                  className="bb-dash-link-sm"
                                >
                                  Archive
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => onDelete(row.id, row.title)}
                              className="bb-dash-delete"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {embargoEdit ? (
              <div className="mt-4 rounded-xl border border-brand-border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-brand-ink">Edit embargo</div>
                    <div className="text-xs text-brand-muted">
                      Change the lift time for this release. The release stays hidden until the new time.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="bb-btn-primary-sm"
                      disabled={pending || embargoBusyId === embargoEdit.id}
                      onClick={() => {
                        void (async () => {
                          setEmbargoBusyId(embargoEdit.id);
                          try {
                            const utc = embargoEdit.value
                              ? new Date(embargoEdit.value).toISOString()
                              : null;
                            const res = await fetch(
                              `/api/releases/${embargoEdit.id}/embargo`,
                              {
                                method: 'PATCH',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ embargo_until: utc }),
                              }
                            );
                            const j = (await readJsonSafely(res)) as any;
                            if (!res.ok || !j || j.success !== true) {
                              alert(
                                j && typeof j.error === 'string'
                                  ? j.error
                                  : `Failed (${res.status}).`
                              );
                              return;
                            }
                            setEmbargoEdit(null);
                            router.refresh();
                          } finally {
                            setEmbargoBusyId(null);
                          }
                        })();
                      }}
                    >
                      Save embargo
                    </button>
                    <button
                      type="button"
                      className="bb-btn-secondary-sm"
                      disabled={pending}
                      onClick={() => setEmbargoEdit(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted">
                    Embargo until (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={embargoEdit.value}
                    min={embargoEdit.min}
                    max={embargoEdit.max}
                    onFocus={() => {
                      const { min, max } = minMaxEmbargo();
                      setEmbargoEdit((e) => (e ? { ...e, min, max } : e));
                    }}
                    onChange={(e) =>
                      setEmbargoEdit((x) => (x ? { ...x, value: e.target.value } : x))
                    }
                    className="flex h-11 w-full max-w-sm rounded-xl bg-white px-4 text-sm text-brand-ink ring-1 ring-inset ring-brand-border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                  />
                  <p className="text-xs text-brand-muted">
                    Times are shown in your browser&apos;s local timezone and stored in UTC.
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="bb-dash-ai-panel">
            <div className="bb-dash-ai-card">
              <h3 className="bb-dash-section-title">Draft preview — AI readiness</h3>
              <p className="bb-dash-ai-desc">
                Generate a Gemini-powered score for your latest draft and get actionable suggestions.
              </p>

              {data.drafts.length === 0 ? (
                <div className="bb-dash-muted-p">
                  <p>
                    No drafts in the queue yet. Create a draft press release to
                    generate an AI readiness score here.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/brand/releases/new"
                      className="bb-btn-primary-sm no-underline"
                    >
                      Create a draft release
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <label className="bb-dash-field-label">
                    Select draft
                  </label>
                  <select
                    className="bb-dash-select"
                    value={selectedDraft?.id ?? ''}
                    onChange={(e) => {
                      setSelectedDraftId(e.target.value);
                      setAiResult(null);
                      setAiError(null);
                    }}
                  >
                    {data.drafts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>

                  <div className="mt-6">
                    <div className="bb-dash-score-row">
                      <span>Score meter</span>
                      <span className="bb-dash-score-num">
                        {(aiResult?.score ?? score) != null
                          ? `${aiResult?.score ?? score}/100`
                          : '—'}
                      </span>
                    </div>
                    <div className="bb-dash-meter-track">
                      <div
                        className="bb-dash-meter-fill"
                        style={{
                          width: `${
                            (aiResult?.score ?? score) != null
                              ? Math.min(
                                  100,
                                  Math.max(0, aiResult?.score ?? score ?? 0)
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="bb-dash-critique-title">Critique</div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="bb-btn-primary-sm"
                        disabled={aiPending || pending}
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
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
