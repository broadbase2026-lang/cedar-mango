'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { APP_NAME } from '@/constants/copy';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'bb_home_audience';

type Audience = 'journalist' | 'brand';
const PANEL_ANIMATION_MS = 1500;

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

const DESKTOP_STRIP_WIDTH = 'w-12';

const panelTransitionStyle = {
  transitionDuration: `${PANEL_ANIMATION_MS}ms`,
  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

const desktopStripButtonClassName = cn(
  'absolute inset-y-0 z-50 hidden md:flex',
  DESKTOP_STRIP_WIDTH,
  'items-center justify-center px-2 py-8',
  'rounded-none bg-accent text-sm font-semibold text-text-inverse',
  'ring-1 ring-inset ring-white/20',
  'transition-[left] ease-in-out motion-reduce:transition-none',
  'hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring',
);

const mobileAudienceCtaWrapClassName = cn(
  'sticky bottom-0 z-20 w-full shrink-0 self-stretch md:hidden',
);

const mobileAudienceCtaClassName = cn(
  'flex w-full min-w-full items-center justify-center px-4 py-3 text-center text-sm font-semibold text-text-inverse',
  'rounded-none bg-accent transition-colors hover:bg-accent-hover',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2',
);

const audienceTrackClassName = cn(
  'relative flex w-[200%] ease-in-out transform-gpu transition-transform will-change-transform',
  'motion-reduce:transition-none motion-reduce:will-change-auto',
);

const audiencePanelClassName =
  'flex min-h-0 w-1/2 shrink-0 flex-col justify-start';

const HERO_PARALLAX_RATE = 0.32;

export function HomeAudienceHero({
  journalist,
  brand,
  radleyClassName,
}: {
  journalist: ReactNode;
  brand: ReactNode;
  radleyClassName: string;
}) {
  const [ready, setReady] = useState(false);
  const [audience, setAudience] = useState<Audience | null>(null);
  /** Start true so the picker paints on first paint; visibility stays tied to `audience === null` once ready. */
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayClosing, setOverlayClosing] = useState(false);

  const overlayTimerRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    try {
      // Always show the audience overlay on each homepage load.
      // We still write the choice to localStorage for potential future use,
      // but we intentionally do not read it to skip the overlay.
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Only force the picker open when no audience is chosen; closing is handled in `choose`.
    if (audience === null) {
      setOverlayVisible(true);
    }
  }, [audience, ready]);

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current !== null) {
        window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) return;

    let frameId = 0;

    const updateParallax = () => {
      frameId = 0;
      const section = sectionRef.current;
      if (!section) return;

      const scrollY = window.scrollY;
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const relativeScroll = scrollY - sectionTop;
      const maxRelativeScroll = Math.max(sectionHeight, window.innerHeight);
      const clampedScroll = Math.min(
        Math.max(relativeScroll, 0),
        maxRelativeScroll,
      );

      setParallaxY(clampedScroll * HERO_PARALLAX_RATE);
    };

    const onScroll = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(updateParallax);
    };

    updateParallax();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const bothPreview = audience === null;
  const showDesktopStrip =
    !bothPreview && (audience === 'brand' || audience === 'journalist');
  const showJournalistStrip =
    !bothPreview && audience === 'brand';
  const showBrandStrip =
    !bothPreview && audience === 'journalist';

  const persistChoice = useCallback((next: Audience) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const choose = useCallback(
    (next: Audience) => {
      if (overlayClosing) return;

      persistChoice(next);
      setOverlayClosing(true);

      if (overlayTimerRef.current !== null) {
        window.clearTimeout(overlayTimerRef.current);
      }

      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const fadeMs = reduced ? 0 : 500;

      overlayTimerRef.current = window.setTimeout(() => {
        setOverlayVisible(false);
        setOverlayClosing(false);
        setAudience(next);
      }, fadeMs);
    },
    [overlayClosing, persistChoice],
  );

  const switchTo = useCallback(
    (next: Audience) => {
      if (next === audience) return;
      persistChoice(next);
      setAudience(next);
    },
    [audience, persistChoice],
  );

  const showOverlay = overlayVisible;

  const trackOffsetClassName = bothPreview
    ? '-translate-x-[25%] motion-reduce:-translate-x-[25%]'
    : audience === 'journalist'
      ? 'translate-x-0'
      : '-translate-x-1/2 motion-reduce:-translate-x-1/2';

  return (
    <section
      ref={sectionRef}
      className="relative isolate"
      style={
        {
          '--hero-parallax-y': `${parallaxY}px`,
        } as CSSProperties
      }
    >
      {showOverlay ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-audience-heading"
          className={cn(
            'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 px-6',
            'bg-[color-mix(in_srgb,var(--bb-top-nav)_60%,transparent)] backdrop-blur-md',
            'transition-opacity duration-500 motion-reduce:transition-none',
            overlayClosing
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100',
          )}
        >
          <Image
            src="/broadbase-logo.png"
            alt={APP_NAME}
            width={180}
            height={32}
            className="h-8 w-auto brightness-0 invert"
            priority
          />
          <p
            id="home-audience-heading"
            className={cn(
              radleyClassName,
              'text-center text-2xl text-white md:text-3xl font-normal tracking-tight',
            )}
          >
            Choose your character
          </p>
          <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full sm:flex-1 bg-white text-brand-ink hover:bg-white/90"
              onClick={() => choose('journalist')}
              disabled={overlayClosing}
            >
              I am a journalist
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full sm:flex-1 bg-white text-brand-ink hover:bg-white/90"
              onClick={() => choose('brand')}
              disabled={overlayClosing}
            >
              I am a brand / agency
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <div className="overflow-x-hidden">
          <div
            className={cn(audienceTrackClassName, trackOffsetClassName)}
            style={ready && !showOverlay ? panelTransitionStyle : undefined}
          >
            {/* Journalist panel */}
          <div
            className={cn(
              audiencePanelClassName,
              'bg-white text-brand-ink',
            )}
          >
            <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col justify-start px-6">
              <div
                className={cn(
                  'relative py-12 md:py-20',
                  bothPreview && 'md:pr-16',
                  audience === 'journalist' && 'md:pr-12',
                )}
              >
                {journalist}
              </div>
            </div>

            {showBrandStrip ? (
              <div
                className={cn(
                  mobileAudienceCtaWrapClassName,
                  'shadow-[0_-8px_24px_rgba(2,6,23,0.10)]',
                )}
              >
                <button
                  type="button"
                  onClick={() => switchTo('brand')}
                  className={mobileAudienceCtaClassName}
                >
                  For brands / agencies
                </button>
              </div>
            ) : null}
          </div>

          {/* Brand panel */}
          <div
            className={cn(
              audiencePanelClassName,
              'bg-brand-dark text-white',
            )}
          >
            <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col justify-start px-6">
              <div
                className={cn(
                  'relative py-12 md:py-20',
                  bothPreview && 'md:pl-16',
                  audience === 'brand' && 'md:pl-12',
                )}
              >
                {brand}
              </div>
            </div>

            {showJournalistStrip ? (
              <div
                className={cn(
                  mobileAudienceCtaWrapClassName,
                  'shadow-[0_-8px_24px_rgba(0,0,0,0.35)]',
                )}
              >
                <button
                  type="button"
                  onClick={() => switchTo('journalist')}
                  className={cn(
                    mobileAudienceCtaClassName,
                    'focus-visible:ring-offset-brand-dark',
                  )}
                >
                  For journalists
                </button>
              </div>
            ) : null}
          </div>
        </div>
        </div>

        {showDesktopStrip ? (
          <button
            type="button"
            onClick={() =>
              switchTo(audience === 'brand' ? 'journalist' : 'brand')
            }
            className={cn(
              desktopStripButtonClassName,
              audience === 'brand' ? 'left-0' : 'left-[calc(100%-3rem)]',
            )}
            style={ready && !showOverlay ? panelTransitionStyle : undefined}
            aria-label={
              audience === 'brand'
                ? 'Switch to journalist view'
                : 'Switch to brand view'
            }
          >
            <span
              className={cn(
                'inline-block max-h-[min(60vh,440px)] overflow-hidden',
                'uppercase tracking-wide',
                audience === 'brand' && 'rotate-180',
              )}
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              {audience === 'brand' ? 'for journalists' : 'for brands'}
            </span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
