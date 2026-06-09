'use client';

import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JournalistChatWidget } from '@/components/journalist/journalist-chat-widget';
import { LogPublicationButton } from '@/components/journalist/LogPublicationButton';
import { TypingSearchPlaceholder } from '@/components/home/typing-search-placeholder';
import { RichTextRender } from '@/components/rich-text/rich-text-render';
import { pressReleasesMock, type PressReleaseMock } from '@/lib/journalist/mockData';
import { formatMonthDayShort } from '@/lib/utils/dates';

const headingFontClassName = 'font-heading';

type JournalistDiscoverViewProps = {
  /**
   * Server-fetched display name from the authenticated session (optional).
   * We keep the view resilient for loading/edge cases.
   */
  userDisplayName?: string | null;
  /** Published releases from Supabase; falls back to mock data when empty. */
  releases?: PressReleaseMock[];
};

type UserDiscoveryPrefs = {
  preferredBeats: Array<'Culture' | 'F&B' | 'Travel'>;
  region: PressReleaseMock['region'];
};

function firstNameFromDisplayName(name?: string | null) {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] ?? 'there';
}

function greetingForLocalTime(d: Date) {
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function formatDate(iso: string) {
  return formatMonthDayShort(iso);
}

function recencyBoost(publishedAt: string) {
  const t = new Date(publishedAt).getTime();
  if (Number.isNaN(t)) return 0;
  const hours = (Date.now() - t) / (60 * 60 * 1000);
  return hours <= 48 ? 1 : 0;
}

function hashToUnit(seed: string) {
  // fast deterministic hash → [0, 1)
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 2 ** 32;
}

function scoreRelease(r: PressReleaseMock, prefs: UserDiscoveryPrefs, seed: string) {
  const beatScore = r.beats.reduce((acc, b) => acc + (prefs.preferredBeats.includes(b) ? 1 : 0), 0);
  const regionScore = r.region === prefs.region ? 1 : r.region === 'APAC' || prefs.region === 'APAC' ? 0.35 : 0;
  const recencyScore = recencyBoost(r.publishedAt) ? 1 : 0;

  // Normalize engagement into a compact score so it doesn’t dominate.
  const engagementRaw = r.engagement.pastReads * 0.6 + r.engagement.pastSaves * 1.4;
  const engagementScore = clamp(Math.log10(1 + engagementRaw) / 3, 0, 1);

  // Small deterministic jitter so “Refresh” feels alive without scrambling relevance.
  const jitter = (hashToUnit(`${seed}-${r.id}`) - 0.5) * 0.18;

  // Weights tuned for “journalist relevance”
  return beatScore * 1.6 + regionScore * 1.25 + recencyScore * 1.15 + engagementScore * 1.4 + jitter;
}

function aspectClass(crop: PressReleaseMock['imageCrop']) {
  switch (crop) {
    case 'small':
      return 'aspect-[4/5]';
    case 'medium':
      return 'aspect-square';
    case 'large':
      return 'aspect-[2/3]';
  }
}

function verticalBadgeClass(v: PressReleaseMock['vertical']) {
  if (v === 'F&B') return 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-700/30';
  if (v === 'Travel') return 'bg-sky-50 text-sky-900 ring-1 ring-inset ring-sky-700/30';
  return 'bg-fuchsia-50 text-fuchsia-900 ring-1 ring-inset ring-fuchsia-700/30';
}

export function JournalistDiscoverView({ userDisplayName, releases }: JournalistDiscoverViewProps) {
  const [mounted, setMounted] = useState(false);
  const [seed, setSeed] = useState('0');
  const [selected, setSelected] = useState<PressReleaseMock | null>(null);
  const [open, setOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(14);
  const [searchText, setSearchText] = useState('');
  const router = useRouter();
  const [activeIds, setActiveIds] = useState<string[]>([]);

  // Mock profile-driven prefs (wire to real profile fields when available).
  const prefs: UserDiscoveryPrefs = useMemo(
    () => ({ preferredBeats: ['Culture', 'F&B'], region: 'SG' }),
    []
  );

  const [greeting, setGreeting] = useState<'morning' | 'afternoon' | 'evening' | 'day'>('day');
  const firstName = useMemo(() => firstNameFromDisplayName(userDisplayName), [userDisplayName]);

  useEffect(() => {
    // Avoid SSR/CSR hydration mismatches from time-based and random initial state.
    setMounted(true);
    setSeed(`${Date.now().toString(16)}`);
    setGreeting(greetingForLocalTime(new Date()));
  }, []);

  const feedSource = releases && releases.length > 0 ? releases : pressReleasesMock;

  const curated = useMemo(() => {
    if (!mounted) return [];
    const scored = feedSource
      .map((r) => ({ r, s: scoreRelease(r, prefs, seed) }))
      .sort((a, b) => b.s - a.s)
      .map(({ r }) => r);
    return scored;
  }, [mounted, prefs, seed, feedSource]);

  const curatedById = useMemo(() => {
    const m = new Map<string, PressReleaseMock>();
    for (const r of curated) m.set(r.id, r);
    return m;
  }, [curated]);

  const visible = useMemo(
    () => activeIds.map((id) => curatedById.get(id)).filter((x): x is PressReleaseMock => Boolean(x)),
    [activeIds, curatedById]
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) setVisibleCount((n) => Math.min(n + 12, curated.length));
      },
      { root: null, rootMargin: '600px 0px', threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [curated.length]);

  // Keep the visible tile IDs stable so individual tiles can be replaced/dismissed.
  useEffect(() => {
    if (!mounted) return;

    setActiveIds((prev) => {
      // If the current list looks invalid (seed change, initial mount), reset from curated.
      const prevSet = new Set(prev);
      const curatedSet = new Set(curated.map((r) => r.id));
      const prevIsSubset = prev.every((id) => curatedSet.has(id));
      if (!prev.length || !prevIsSubset) {
        return curated.slice(0, visibleCount).map((r) => r.id);
      }

      // Expand/shrink to match `visibleCount` while keeping ordering stable.
      let next = prev.slice(0, visibleCount);
      const nextSet = new Set(next);
      if (next.length < visibleCount) {
        for (const r of curated) {
          if (next.length >= visibleCount) break;
          if (!nextSet.has(r.id)) {
            next.push(r.id);
            nextSet.add(r.id);
          }
        }
      }
      return next;
    });
  }, [mounted, curated, visibleCount]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function onRefresh() {
    setSeed(`${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);
    setVisibleCount(14);
  }

  function onOpenRelease(r: PressReleaseMock) {
    setSelected(r);
    setOpen(true);
  }

  function onDismissRelease(releaseId: string) {
    setActiveIds((prev) => {
      const idx = prev.indexOf(releaseId);
      if (idx < 0) return prev;

      const inUse = new Set(prev);
      inUse.delete(releaseId);

      const replacement =
        curated.find((r) => !inUse.has(r.id) && r.id !== releaseId)?.id ??
        curated.find((r) => r.id !== releaseId)?.id ??
        null;

      if (!replacement) return prev;
      const next = prev.slice();
      next[idx] = replacement;
      return next;
    });
  }

  return (
    <main className="bb-dash-main">
      <div className="bb-dash-inner">
        <div className="mt-3 w-full">
          <div className="mx-auto max-w-[1100px]">
            <div className="flex items-start gap-4">
              <div
                className={
                  headingFontClassName +
                  ' flex-1 text-center text-balance text-4xl font-normal leading-[1.05] tracking-[-0.01em] text-brand-ink'
                }
              >
                Good {greeting}, {firstName}
              </div>
              <div className="hidden sm:flex shrink-0 flex-col items-end">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-ink shadow-sm hover:bg-brand-surface"
                >
                  <RotateCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-center sm:hidden">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-ink shadow-sm hover:bg-brand-surface"
              >
                <RotateCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {!mounted ? (
            <div className="pb-10 text-center text-sm text-brand-muted">Loading…</div>
          ) : null}
          <form
            className="rounded-2xl bg-transparent p-0"
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchText.trim();
              router.push(q ? `/journalist/search?q=${encodeURIComponent(q)}` : '/journalist/search');
            }}
          >
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-brand-border/60">
              <div className="flex h-14 items-stretch">
                <div className="relative min-w-0 flex-1">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder=""
                  aria-label="Search press releases"
                  className="h-14 w-full rounded-none bg-transparent px-5 text-base text-brand-ink outline-none placeholder:text-brand-muted/80"
                />
                {searchText.trim().length ? null : (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex h-14 items-center px-5 text-base text-brand-muted/80">
                      <TypingSearchPlaceholder
                        terms={[
                          'luxury hotel openings in Singapore...',
                          'new bars in Tokyo...',
                          'upcoming art exhibitions in Hong Kong...',
                        ]}
                      />
                    </div>
                )}
                </div>
                <button
                  type="submit"
                  className="h-14 shrink-0 bg-brand-primary px-7 text-sm font-semibold text-white transition hover:bg-brand-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-0"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5 columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            <AnimatePresence initial={false}>
              {visible.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } }}
                  exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
                  className="mb-4 w-full break-inside-avoid"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenRelease(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenRelease(r);
                      }
                    }}
                    className="group relative w-full rounded-2xl border border-brand-border bg-white text-left shadow-sm transition hover:-translate-y-[1px] hover:shadow-media-soft focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                  >
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDismissRelease(r.id);
                      }}
                      className="absolute right-2 top-2 z-10 hidden h-8 w-8 items-center justify-center rounded-full border border-brand-border bg-white/90 text-brand-ink shadow-sm backdrop-blur transition hover:bg-brand-surface group-hover:inline-flex focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className={'w-full overflow-hidden rounded-t-2xl bg-brand-surface-2 ' + aspectClass(r.imageCrop)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.heroImageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ' + verticalBadgeClass(r.vertical)}
                        >
                          {r.vertical}
                        </span>
                        <span className="text-[11px] text-brand-muted">{formatDate(r.publishedAt)}</span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-brand-ink line-clamp-2">{r.title}</div>
                      <div className="mt-2 text-sm text-brand-muted line-clamp-3">{r.summary}</div>
                      <div
                        className="mt-3"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <LogPublicationButton disabled />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div ref={sentinelRef} className="h-10" />
          {visibleCount < curated.length ? (
            <div className="pb-10 text-center text-xs text-brand-muted">Loading more…</div>
          ) : (
            <div className="pb-10 text-center text-xs text-brand-muted">You’re all caught up.</div>
          )}
        </div>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <AnimatePresence>
          {open ? (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/40"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ x: 40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 40, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  className="fixed inset-y-0 right-0 z-50 flex h-dvh w-full max-w-[520px] flex-col border-l border-brand-border bg-white shadow-media-soft"
                >
                  <div className="shrink-0 border-b border-brand-border bg-white/90 p-4 backdrop-blur">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {selected ? (
                            <span
                              className={
                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                                verticalBadgeClass(selected.vertical)
                              }
                            >
                              {selected.vertical}
                            </span>
                          ) : null}
                          {selected ? <span className="text-[11px] text-brand-muted">{formatDate(selected.publishedAt)}</span> : null}
                        </div>
                        <Dialog.Title className="mt-2 text-base font-semibold text-brand-ink">
                          {selected?.title ?? 'Preview'}
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-brand-muted">
                          Full press release details and downloadable media.
                        </Dialog.Description>
                      </div>
                      <Dialog.Close asChild>
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-white text-brand-ink hover:bg-brand-surface"
                          aria-label="Close"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Dialog.Close>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                    {selected ? (
                      <>
                        <div className="overflow-hidden rounded-2xl bg-brand-surface-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selected.heroImageUrl}
                            alt=""
                            className="aspect-[4/3] w-full object-cover"
                          />
                        </div>

                        {selected.summary ? (
                          <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4">
                            <div className="text-sm font-semibold text-brand-ink">Summary</div>
                            <div className="mt-1 text-sm text-brand-muted">{selected.summary}</div>
                          </div>
                        ) : null}

                        <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4">
                          <div className="text-sm font-semibold text-brand-ink">Body</div>
                          <RichTextRender html={selected.body} className="mt-2 bb-richtext text-sm leading-relaxed text-brand-ink/90" />
                        </div>

                        <div className="mt-4 rounded-2xl border border-brand-border bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-brand-ink">Media assets</div>
                            <div className="text-xs text-brand-muted">
                              Reads {selected.engagement.pastReads} · Saves {selected.engagement.pastSaves}
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {selected.mediaAssets.length === 0 ? (
                              <p className="text-sm text-brand-muted">No assets attached.</p>
                            ) : (
                              selected.mediaAssets.map((a) => (
                                <a
                                  key={a.href}
                                  href={a.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-medium text-brand-primary-700 hover:bg-brand-surface"
                                >
                                  {a.label}
                                </a>
                              ))
                            )}
                          </div>
                          {selected.slug ? (
                            <div className="mt-4 border-t border-brand-border/70 pt-3">
                              <Link
                                href={`/journalist/release/${selected.slug}`}
                                prefetch={false}
                                className="text-sm font-medium text-brand-primary-700 hover:underline"
                              >
                                Open full release page →
                              </Link>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-brand-border bg-white p-4 text-sm text-brand-muted">
                        Select a press release to preview.
                      </div>
                    )}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          ) : null}
        </AnimatePresence>
      </Dialog.Root>

      <JournalistChatWidget />
    </main>
  );
}

