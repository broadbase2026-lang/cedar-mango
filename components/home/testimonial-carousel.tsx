'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Testimonial = {
  imageSrc?: string;
  imageAlt?: string;
  quote: string;
  name: string;
  title: string;
};

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

function svgPlaceholderDataUri({
  label,
  from,
  to,
}: {
  label: string;
  from: string;
  to: string;
}) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#000000" flood-opacity="0.20"/>
    </filter>
  </defs>
  <rect width="800" height="800" rx="72" fill="url(#g)"/>
  <circle cx="620" cy="200" r="150" fill="#ffffff" opacity="0.12"/>
  <circle cx="180" cy="640" r="220" fill="#ffffff" opacity="0.10"/>
  <g filter="url(#s)">
    <text x="50%" y="54%" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto" font-size="160" font-weight="700" fill="#ffffff" opacity="0.92">${label}</text>
  </g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function TestimonialCarousel({
  heading,
  className,
  testimonials,
}: {
  heading?: string;
  className?: string;
  testimonials?: Testimonial[];
}) {
  const items = useMemo<Testimonial[]>(
    () =>
      testimonials ?? [
        {
          imageAlt: 'Alicia Tan',
          quote:
            'Broadbase replaces the cold pitch cycle with a clean, editor-first workflow.',
          name: 'Alicia Tan',
          title: 'Lifestyle Editor',
        },
        {
          imageAlt: 'Marcus Lee',
          quote:
            'The asset library is actually usable. I can find what I need in seconds.',
          name: 'Marcus Lee',
          title: 'Senior Reporter',
        },
        {
          imageAlt: 'Priya Nair',
          quote:
            'Press kits that don’t feel like a PDF dump. It’s curated, current, and fast.',
          name: 'Priya Nair',
          title: 'Features Director',
        },
        {
          imageAlt: 'Sophie Wong',
          quote:
            'We finally see what journalists engage with—and what to improve next.',
          name: 'Sophie Wong',
          title: 'Brand Comms Lead',
        },
        {
          imageAlt: 'Jon Park',
          quote:
            'Search is the difference. I can filter by beat and get the newest releases instantly.',
          name: 'Jon Park',
          title: 'Digital Editor',
        },
        {
          imageAlt: 'Nina Cho',
          quote:
            'Publishing once and staying discoverable is a game changer for lean teams.',
          name: 'Nina Cho',
          title: 'PR Manager',
        },
      ],
    [testimonials],
  );

  const renderedItems = useMemo(() => {
    // 3x copy lets us "wrap" seamlessly by snapping back into the middle copy.
    return [...items, ...items, ...items];
  }, [items]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const centerRenderedIndex = useCallback(
    (renderedIndex: number, behavior: ScrollBehavior) => {
    const track = trackRef.current;
    const el = cardRefs.current[renderedIndex];
    if (!track || !el) return;
    const left =
      el.offsetLeft + el.offsetWidth / 2 - track.clientWidth / 2;
    track.scrollTo({ left, behavior });
    },
    [],
  );

  const centerLogicalIndex = useCallback(
    (logicalIndex: number, behavior: ScrollBehavior) => {
    const n = items.length;
    if (n === 0) return;
    // Always target the middle copy to keep room on both sides.
    centerRenderedIndex(n + ((logicalIndex % n) + n) % n, behavior);
    },
    [centerRenderedIndex, items.length],
  );

  useEffect(() => {
    // On mount (and whenever the list changes), jump to the middle copy.
    // rAF ensures layout is ready for offset measurements.
    const track = trackRef.current;
    if (!track) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => centerLogicalIndex(activeIndex, reduced ? 'auto' : 'auto'));
  }, [activeIndex, centerLogicalIndex, items.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = cardRefs.current;
    const n = items.length;

    const tick = () => {
      const rect = track.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;

      let bestIndex = 0;
      let bestDist = Number.POSITIVE_INFINITY;

      for (let i = 0; i < renderedItems.length; i += 1) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const cardCenter = r.left + r.width / 2;
        const dist = Math.abs(cardCenter - centerX);
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = i;
        }

        const t = clamp(1 - dist / (rect.width * 0.6), 0, 1);
        const scale = 0.92 + t * 0.16; // 0.92 → 1.08
        el.style.setProperty('--bb-scale', String(scale));
        el.style.setProperty('--bb-opacity', String(0.55 + t * 0.45));
      }

      const logical = n === 0 ? 0 : bestIndex % n;
      setActiveIndex((prev) => (prev === logical ? prev : logical));

      // If we've drifted into the first/last copy, jump (no animation) to the
      // corresponding card in the middle copy. This keeps the loop infinite.
      if (n > 0) {
        if (bestIndex < n || bestIndex >= n * 2) {
          centerLogicalIndex(logical, 'auto');
        }
      }
      rafRef.current = null;
    };

    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    schedule();
    track.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      track.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (!reduced) {
        for (const el of cards) {
          el?.style.removeProperty('--bb-scale');
          el?.style.removeProperty('--bb-opacity');
        }
      }
    };
  }, [centerLogicalIndex, items.length, renderedItems]);

  const scrollToIndex = (logicalIndex: number) => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    centerLogicalIndex(logicalIndex, reduced ? 'auto' : 'smooth');
  };

  const prev = () => scrollToIndex((activeIndex - 1 + items.length) % items.length);
  const next = () => scrollToIndex((activeIndex + 1) % items.length);

  return (
    <section className={cn('w-full', className)}>
      <div className="mx-auto max-w-6xl px-6">
        <div
          className={cn(
            'flex items-end gap-4',
            heading ? 'justify-between' : 'justify-end',
          )}
        >
          {heading ? (
            <h2 className="text-xs font-semibold tracking-wide text-brand-muted uppercase">
              {heading}
            </h2>
          ) : null}

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-full',
                'bg-white/70 text-brand-ink ring-1 ring-inset ring-brand-border/70',
                'shadow-sm transition hover:bg-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface',
              )}
              aria-label="Previous testimonial"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-full',
                'bg-white/70 text-brand-ink ring-1 ring-inset ring-brand-border/70',
                'shadow-sm transition hover:bg-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 focus-visible:ring-offset-brand-surface',
              )}
              aria-label="Next testimonial"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Full-bleed carousel track */}
      <div
        className={cn(
          'relative left-1/2 right-1/2 w-screen -ml-[50vw] -mr-[50vw] overflow-visible',
          heading ? 'mt-6' : 'mt-2',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-brand-surface to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-brand-surface to-transparent"
        />

        <div
          ref={trackRef}
          className={cn(
            'flex gap-16 overflow-x-auto py-8',
            'scrollbar-none',
            'snap-x snap-mandatory',
            'px-6 sm:px-10',
          )}
          style={{
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {renderedItems.map((t, idx) => (
            (() => {
              const logicalIdx = items.length === 0 ? 0 : idx % items.length;
              const palette = [
                ['#0ea5e9', '#14b8a6'],
                ['#8b5cf6', '#ec4899'],
                ['#22c55e', '#0ea5e9'],
                ['#f97316', '#f43f5e'],
                ['#06b6d4', '#a855f7'],
                ['#10b981', '#0ea5e9'],
              ] as const;
              const [from, to] = palette[logicalIdx % palette.length];
              const label = initials(t.name);
              const src =
                t.imageSrc ??
                svgPlaceholderDataUri({
                  label,
                  from,
                  to,
                });
              const alt = t.imageAlt ?? t.name;

              return (
          <div
            key={`${t.name}-${idx}`}
            ref={(node) => {
              cardRefs.current[idx] = node;
            }}
            className={cn(
              'snap-center shrink-0 w-[260px] sm:w-[300px]',
              'rounded-2xl overflow-hidden',
              'bg-white ring-1 ring-inset ring-brand-border',
              'shadow-media-soft',
              'transform-gpu',
              'transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
            )}
            style={{
              transform: 'scale(var(--bb-scale, 0.96))',
              opacity: 'var(--bb-opacity, 0.8)',
            }}
          >
            <div className="relative aspect-square w-full bg-brand-surface-2">
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 640px) 260px, 300px"
                className="object-cover"
              />
            </div>

            <div className="p-6">
              <div className="text-sm leading-relaxed text-brand-ink">
                “{t.quote}”
              </div>
              <div className="mt-5 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-brand-ink">
                    {t.name}
                  </div>
                  <div className="text-xs text-brand-muted">{t.title}</div>
                </div>
                <div className="text-xs font-semibold text-brand-primary-700">
                  Broadbase
                </div>
              </div>
            </div>
          </div>
              );
            })()
          ))}
        </div>

        <div className="mt-1 flex items-center justify-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={prev}
            className="bb-btn-primary-sm bg-brand-primary/10 text-brand-ink ring-1 ring-inset ring-brand-border hover:bg-brand-primary/15"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={next}
            className="bb-btn-primary-sm bg-brand-primary/10 text-brand-ink ring-1 ring-inset ring-brand-border hover:bg-brand-primary/15"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

