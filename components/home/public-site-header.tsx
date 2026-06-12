'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/constants/copy';
import { ButtonLink } from '@/components/ui/button';
import { GeoNavLink } from '@/components/home/geo-nav-link';
import { PricingNavLink } from '@/components/home/pricing-nav-link';
import { useLenisScrollLock } from '@/components/smooth-scroll-provider';

const NAV_COLOR_START = '#ffb81a';
const NAV_COLOR_END = '#EF5301';
const NAV_CTA_CLASS = '!h-8 !min-h-8 !rounded-full px-4 sm:px-5';
const NAV_BLUR_BELOW_GAP_PX = 10;

function interpolateHexColor(from: string, to: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  };
  const start = parse(from);
  const end = parse(to);
  const clamped = Math.min(1, Math.max(0, t));
  const r = Math.round(start.r + (end.r - start.r) * clamped);
  const g = Math.round(start.g + (end.g - start.g) * clamped);
  const b = Math.round(start.b + (end.b - start.b) * clamped);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export function PublicSiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useLenisScrollLock(menuOpen);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const updateNavBlurHeight = useCallback(() => {
    const header = headerRef.current;
    const blur = blurRef.current;
    if (!header || !blur) return;

    const { bottom } = header.getBoundingClientRect();
    blur.style.height = `${bottom + NAV_BLUR_BELOW_GAP_PX}px`;
  }, []);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    updateNavBlurHeight();

    const header = headerRef.current;
    const pill = pillRef.current;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && header
        ? new ResizeObserver(updateNavBlurHeight)
        : null;
    resizeObserver?.observe(header!);
    resizeObserver?.observe(pill!);

    window.addEventListener('resize', updateNavBlurHeight, { passive: true });
    window.addEventListener('scroll', updateNavBlurHeight, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateNavBlurHeight);
      window.removeEventListener('scroll', updateNavBlurHeight);
      blurRef.current?.style.removeProperty('height');
    };
  }, [updateNavBlurHeight]);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) return;

    let frameId = 0;

    const updateNavColor = () => {
      frameId = 0;
      const pill = pillRef.current;
      if (!pill) return;

      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? Math.min(Math.max(window.scrollY / scrollable, 0), 1)
          : 0;
      pill.style.setProperty(
        '--bb-top-nav',
        interpolateHexColor(NAV_COLOR_START, NAV_COLOR_END, progress),
      );
    };

    const onScroll = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(updateNavColor);
    };

    updateNavColor();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    const pillEl = pillRef.current;

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      pillEl?.style.removeProperty('--bb-top-nav');
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    }, 0);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [menuOpen, closeMenu]);

  return (
    <>
      <header ref={headerRef} className="bb-public-site-header">
        <div
          ref={blurRef}
          className="bb-nav-top-blur liquid-glass-strong"
          aria-hidden
        />
        <div className="relative z-10 flex justify-center px-3 pt-2 sm:px-4 sm:pt-3">
        <div
          ref={pillRef}
          className="bb-top-nav-pill relative w-[90vw]"
        >
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex shrink-0 items-center text-brand-ink">
              <Image
                src="/broadbase-logo.png"
                alt={APP_NAME}
                width={113}
                height={20}
                className="h-[1.4rem] w-auto"
                priority
              />
            </Link>

            <nav
              className="ml-auto hidden items-center gap-6 md:flex"
              aria-label="Main"
            >
              <div className="flex items-center gap-8">
                <GeoNavLink />
                <PricingNavLink />
              </div>
              <Link href="/login" className="bb-nav-link">
                Log In
              </Link>
              <ButtonLink
                href="/signup"
                size="sm"
                variant="accent"
                className={NAV_CTA_CLASS}
              >
                Get Started
              </ButtonLink>
            </nav>

            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-ink transition-colors hover:bg-brand-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="public-site-mobile-nav"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X size={18} strokeWidth={2} aria-hidden />
              ) : (
                <Menu size={18} strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>

          {menuOpen ? (
            <div
              id="public-site-mobile-nav"
              ref={drawerRef}
              className="absolute left-2 right-2 top-full z-20 mt-2 rounded-2xl border border-brand-border/70 p-3 shadow-lg backdrop-blur md:hidden"
              style={{ backgroundColor: 'var(--bb-top-nav)' }}
            >
              <nav className="flex flex-col" aria-label="Mobile">
                <GeoNavLink className="w-full border-b border-brand-ink/10 px-0" />
                <PricingNavLink className="w-full border-b border-brand-ink/10 px-0" />
                <Link
                  href="/login"
                  className="bb-nav-link w-full border-b border-brand-ink/10 px-0"
                  onClick={closeMenu}
                >
                  Log In
                </Link>
                <div className="pt-4 pb-1">
                  <ButtonLink
                    href="/signup"
                    variant="accent"
                    size="md"
                    className={`w-full ${NAV_CTA_CLASS}`}
                    onClick={closeMenu}
                  >
                    Get Started
                  </ButtonLink>
                </div>
              </nav>
            </div>
          ) : null}
        </div>
        </div>
      </header>
      <div className="bb-public-site-header-spacer" aria-hidden="true" />
    </>
  );
}
