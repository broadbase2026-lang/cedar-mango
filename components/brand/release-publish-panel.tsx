'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

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

type PublishApiResponse = {
  success?: boolean;
  error?: string;
  data?: { redirectTo?: string };
};

export function ReleasePublishPanel(props: {
  releaseId: string;
  status: 'draft' | 'published' | 'archived' | string;
  plan: string | null;
  embargoUntil: string | null;
}) {
  const { releaseId, status, plan, embargoUntil } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canUseEmbargo = plan === 'pro' || plan === 'agency';

  const { min, max } = useMemo(() => minMaxEmbargo(), []);
  const [embargoLocal, setEmbargoLocal] = useState<string>(() => {
    if (!embargoUntil) return '';
    const d = new Date(embargoUntil);
    if (!Number.isFinite(d.getTime()) || d <= new Date()) return '';
    return toDatetimeLocalValue(embargoUntil);
  });

  if (status !== 'draft') return null;

  return (
    <section className="mt-6 rounded-xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-brand-ink">Publish</div>
          <div className="mt-1 text-xs text-brand-muted">
            Publishing makes this release visible in your newsroom. You can optionally set an embargo.
          </div>
        </div>
        <button
          type="button"
          className="bb-btn-primary-sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                const embargoUntilUtc = embargoLocal
                  ? new Date(embargoLocal).toISOString()
                  : undefined;
                const res = await fetch('/api/press-releases/publish', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    releaseId,
                    ...(embargoUntilUtc ? { embargo_until: embargoUntilUtc } : {}),
                  }),
                });

                let json: PublishApiResponse | null = null;
                try {
                  json = (await res.json()) as PublishApiResponse;
                } catch {
                  json = null;
                }

                if (!json || json.success !== true) {
                  if (json?.data?.redirectTo) {
                    router.push(json.data.redirectTo);
                    return;
                  }
                  setError(
                    typeof json?.error === 'string' && json.error.length > 0
                      ? json.error
                      : `Publish failed (${res.status}).`
                  );
                  return;
                }

                router.refresh();
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Publish failed.');
              }
            });
          }}
        >
          {embargoLocal && canUseEmbargo ? 'Publish with embargo' : 'Publish'}
        </button>
      </div>

      {canUseEmbargo ? (
        <div className="mt-4 space-y-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-muted">
            Embargo until (optional)
          </label>
          <input
            type="datetime-local"
            value={embargoLocal}
            min={min}
            max={max}
            onChange={(e) => setEmbargoLocal(e.target.value)}
            className="flex h-11 w-full max-w-sm rounded-xl bg-white px-4 text-sm text-brand-ink ring-1 ring-inset ring-brand-border shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
          />
          <p className="text-xs text-brand-muted">
            Times are shown in your browser&apos;s local timezone and stored in UTC.
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
          <div className="font-medium">Embargo scheduling locked</div>
          <div className="mt-1 text-neutral-700">
            Upgrade to Pro to publish with an embargo time.
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </section>
  );
}
