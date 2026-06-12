'use client';

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

type LenisControl = {
  stop: () => void;
  start: () => void;
  scrollToTop: (immediate?: boolean) => void;
};

const LenisContext = createContext<LenisControl | null>(null);

export function useLenisControl(): LenisControl | null {
  return useContext(LenisContext);
}

/** Pause Lenis while `locked` is true (e.g. modal open). Restores on cleanup. */
export function useLenisScrollLock(locked: boolean) {
  const lenis = useLenisControl();

  useLayoutEffect(() => {
    if (!locked) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    if (lenis) {
      lenis.scrollToTop(true);
      lenis.stop();
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      lenis?.start();
    };
  }, [locked, lenis]);
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  const control = useMemo<LenisControl>(
    () => ({
      stop: () => {
        lenisRef.current?.stop();
      },
      start: () => {
        lenisRef.current?.start();
      },
      scrollToTop: (immediate = true) => {
        lenisRef.current?.scrollTo(0, { immediate });
      },
    }),
    [],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', ScrollTrigger.update);
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <LenisContext.Provider value={control}>{children}</LenisContext.Provider>;
}
