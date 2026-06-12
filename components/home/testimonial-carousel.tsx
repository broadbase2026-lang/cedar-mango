'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';

type Testimonial = {
  imageSrc?: string;
  imageAlt?: string;
  quote: string;
  name: string;
  title: string;
};

const TICKER_SPEED_PX_PER_SEC = 45;

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
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

function TestimonialCard({
  testimonial,
  logicalIdx,
}: {
  testimonial: Testimonial;
  logicalIdx: number;
}) {
  const palette = [
    ['#0ea5e9', '#14b8a6'],
    ['#8b5cf6', '#ec4899'],
    ['#22c55e', '#0ea5e9'],
    ['#f97316', '#f43f5e'],
    ['#06b6d4', '#a855f7'],
    ['#10b981', '#0ea5e9'],
  ] as const;
  const [from, to] = palette[logicalIdx % palette.length];
  const label = initials(testimonial.name);
  const src =
    testimonial.imageSrc ??
    svgPlaceholderDataUri({
      label,
      from,
      to,
    });
  const alt = testimonial.imageAlt ?? testimonial.name;

  return (
    <div
      className={cn(
        'shrink-0 w-[260px] sm:w-[300px]',
        'rounded-2xl overflow-hidden',
        'bg-white ring-1 ring-inset ring-brand-border',
        'shadow-media-soft',
      )}
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
          &ldquo;{testimonial.quote}&rdquo;
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-brand-ink">
              {testimonial.name}
            </div>
            <div className="text-xs text-brand-muted">{testimonial.title}</div>
          </div>
          <div className="text-xs font-semibold text-brand-primary-700">
            Broadbase
          </div>
        </div>
      </div>
    </div>
  );
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || items.length === 0) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const ctx = gsap.context(() => {
      const buildTween = () => {
        tweenRef.current?.kill();
        gsap.set(row, { xPercent: 0 });

        const setWidth = row.scrollWidth / 2;
        const duration = setWidth / TICKER_SPEED_PX_PER_SEC;

        tweenRef.current = gsap.to(row, {
          xPercent: -50,
          duration,
          ease: 'none',
          repeat: -1,
        });
      };

      buildTween();

      const resizeObserver = new ResizeObserver(() => {
        if (resizeTimer !== null) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(buildTween, 150);
      });
      resizeObserver.observe(row);

      return () => {
        resizeObserver.disconnect();
        if (resizeTimer !== null) clearTimeout(resizeTimer);
      };
    }, containerRef);

    return () => {
      ctx.revert();
      tweenRef.current = null;
    };
  }, [items]);

  const pauseTicker = () => {
    tweenRef.current?.pause();
  };

  const playTicker = () => {
    tweenRef.current?.play();
  };

  return (
    <section
      className={cn('w-full overflow-x-clip', className)}
      aria-label="Testimonials"
    >
      {heading ? (
        <div className="bb-container">
          <h2 className="text-xs font-semibold tracking-wide text-brand-muted uppercase">
            {heading}
          </h2>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={cn(
          'relative -mx-6 w-[calc(100%+3rem)] overflow-x-clip sm:-mx-10 sm:w-[calc(100%+5rem)]',
          heading ? 'mt-6' : 'mt-2',
        )}
        onMouseEnter={pauseTicker}
        onMouseLeave={playTicker}
        onFocusCapture={pauseTicker}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            playTicker();
          }
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-brand-surface to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-brand-surface to-transparent"
        />

        <div className="overflow-hidden py-8">
          <div
            ref={rowRef}
            className="flex w-max gap-8 will-change-transform sm:gap-16"
          >
            {items.map((t, idx) => (
              <TestimonialCard
                key={`${t.name}-a-${idx}`}
                testimonial={t}
                logicalIdx={idx}
              />
            ))}
            {items.map((t, idx) => (
              <div key={`${t.name}-b-${idx}`} aria-hidden="true">
                <TestimonialCard testimonial={t} logicalIdx={idx} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
