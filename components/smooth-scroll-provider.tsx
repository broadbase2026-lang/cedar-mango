'use client';

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

type LenisControl = {
  stop: () => void;
  start: () => void;
};

const LenisContext = createContext<LenisControl | null>(null);

export function useLenisControl(): LenisControl | null {
  return useContext(LenisContext);
}

/** Pause Lenis while `locked` is true (e.g. modal open). Restores on cleanup. */
export function useLenisScrollLock(locked: boolean) {
  const lenis = useLenisControl();

  useEffect(() => {
    if (!locked || !lenis) return;
    lenis.stop();
    return () => {
      lenis.start();
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

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <LenisContext.Provider value={control}>{children}</LenisContext.Provider>;
}
