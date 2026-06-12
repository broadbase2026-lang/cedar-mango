'use client';

import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { APP_NAME } from '@/constants/copy';
import { SIGNUP_HERO_GRADIENT } from '@/components/home/feature-card-gradients';
import { AudienceRailButton } from '@/components/home/audience-rail-button';
import { Button } from '@/components/ui/button';
import { useLenisScrollLock } from '@/components/smooth-scroll-provider';

const STORAGE_KEY = 'bb_home_audience';

type Audience = 'journalist' | 'brand';
const PANEL_ANIMATION_MS = 1500;

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

const panelTransitionStyle = {
  transitionDuration: `${PANEL_ANIMATION_MS}ms`,
  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

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
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);

  const overlayTimerRef = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [parallaxY, setParallaxY] = useState(0);

  const showOverlay = overlayVisible;

  useLenisScrollLock(showOverlay && !overlayClosing);

  useLayoutEffect(() => {
    setReady(true);
    setOverlayMounted(true);
  }, []);

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

  useEffect(() => {
    if (!showOverlay || overlayClosing) return;
    const id = window.requestAnimationFrame(() => {
      overlayRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [showOverlay, overlayClosing]);

  useEffect(() => {
    if (!showOverlay || overlayClosing || !overlayMounted) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let ctx: gsap.Context | null = null;
    let cancelled = false;
    const frameId = window.requestAnimationFrame(() => {
      if (cancelled) return;

      const overlay = overlayRef.current;
      const buttonWrap = overlay?.querySelector<HTMLElement>(
        '[data-audience-overlay-buttons]',
      );
      const buttons = buttonWrap?.querySelectorAll('button');
      if (!overlay || !buttonWrap || !buttons?.length) return;

      ctx = gsap.context(() => {
        if (reducedMotion) {
          gsap.set(buttons, { rotationX: 0, opacity: 1, y: 0, clearProps: 'transform' });
          return;
        }

        gsap.set(buttonWrap, { perspective: 900 });
        gsap.fromTo(
          buttons,
          {
            rotationX: -90,
            opacity: 0,
            y: -8,
            transformOrigin: '50% 0%',
            transformPerspective: 900,
          },
          {
            rotationX: 0,
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: 'back.out(1.35)',
            delay: 0.2,
          },
        );
      }, overlay);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      ctx?.revert();
    };
  }, [showOverlay, overlayClosing, overlayMounted]);

  const trackOffsetClassName = bothPreview
    ? '-translate-x-[25%] motion-reduce:-translate-x-[25%]'
    : audience === 'journalist'
      ? 'translate-x-0'
      : '-translate-x-1/2 motion-reduce:-translate-x-1/2';

  const overlay = showOverlay ? (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-audience-heading"
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 px-6',
        'transition-opacity duration-500 ease-in-out motion-reduce:transition-none',
        overlayClosing ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{ background: SIGNUP_HERO_GRADIENT }}
    >
      <Image
        src="/broadbase-logo.png"
        alt={APP_NAME}
        width={180}
        height={32}
        className="h-8 w-auto"
        priority
      />
      <p
        id="home-audience-heading"
        className={cn(
          radleyClassName,
          'text-center text-2xl font-normal tracking-tight text-brand-ink md:text-3xl',
        )}
      >
        Choose your character
      </p>
      <div
        data-audience-overlay-buttons
        className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center [perspective:900px]"
      >
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full origin-top bg-white text-brand-ink hover:bg-white/90 sm:flex-1"
          onClick={() => choose('journalist')}
          disabled={overlayClosing}
        >
          I am a journalist
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full origin-top bg-white text-brand-ink hover:bg-white/90 sm:flex-1"
          onClick={() => choose('brand')}
          disabled={overlayClosing}
        >
          I am a brand / agency
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <section
      ref={sectionRef}
      className="bb-home-audience-hero relative isolate"
      style={
        {
          '--hero-parallax-y': `${parallaxY}px`,
        } as CSSProperties
      }
    >
      {overlayMounted && overlay
        ? createPortal(overlay, document.body)
        : null}

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
                  'bb-home-audience-panel-content relative',
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
                  'bb-home-audience-panel-content relative',
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
          <AudienceRailButton
            label={audience === 'brand' ? 'PRESS' : 'BRANDS'}
            side={audience === 'brand' ? 'left' : 'right'}
            onClick={() =>
              switchTo(audience === 'brand' ? 'journalist' : 'brand')
            }
            ariaLabel={
              audience === 'brand'
                ? 'Switch to press view'
                : 'Switch to brands view'
            }
            animatePosition
            style={ready && !showOverlay ? panelTransitionStyle : undefined}
          />
        ) : null}
      </div>
    </section>
  );
}
