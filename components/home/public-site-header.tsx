'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { APP_NAME } from '@/constants/copy';
import { Button } from '@/components/ui/button';
import { PricingNavLink } from '@/components/home/pricing-nav-link';

const NAV_COLOR_START = '#ffb81a';
const NAV_COLOR_END = '#EF5301';

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

type PublicSiteHeaderProps = {
  scrollNavColor?: boolean;
};

export function PublicSiteHeader({ scrollNavColor = false }: PublicSiteHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!scrollNavColor) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) return;

    let frameId = 0;

    const updateNavColor = () => {
      frameId = 0;
      const header = headerRef.current;
      if (!header) return;

      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? Math.min(Math.max(window.scrollY / scrollable, 0), 1)
          : 0;
      header.style.setProperty(
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

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      headerRef.current?.style.removeProperty('--bb-top-nav');
    };
  }, [scrollNavColor]);

  return (
    <header ref={headerRef} className="bb-top-nav">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center text-brand-ink">
            <Image
              src="/broadbase-logo.png"
              alt={APP_NAME}
              width={141}
              height={25}
              className="h-7 w-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-6">
            <PricingNavLink />
            <Link
              href="/login"
              className="text-sm font-medium text-brand-muted hover:text-brand-ink transition-colors"
            >
              Log In
            </Link>
            <Link href="/signup">
              <Button size="sm" variant="accent">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
