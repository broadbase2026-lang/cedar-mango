'use client';

import { useEffect, useMemo, useState } from 'react';

type Phase = 'typing' | 'pausing' | 'deleting';

export function TypingSearchPlaceholder({
  prefix = 'Search for\u00A0',
  terms,
  typingMs = 45,
  deletingMs = 28,
  pauseMs = 900,
}: {
  prefix?: string;
  terms: string[];
  typingMs?: number;
  deletingMs?: number;
  pauseMs?: number;
}) {
  const safeTerms = useMemo(
    () => (terms.length ? terms : ['something new']),
    [terms],
  );

  const [termIdx, setTermIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [cursor, setCursor] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq: MediaQueryList | null =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    if (!mq) return;

    const update = () => setReducedMotion(mq.matches);
    update();

    // Safari fallback: older versions use addListener/removeListener.
    if ('addEventListener' in mq) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    // Safari fallback: older versions use addListener/removeListener.
    (mq as unknown as { addListener: (cb: () => void) => void }).addListener(update);
    return () =>
      (mq as unknown as { removeListener: (cb: () => void) => void }).removeListener(update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const current = safeTerms[termIdx] ?? '';
    const isTyping = phase === 'typing';
    const isDeleting = phase === 'deleting';

    const tickMs = isTyping ? typingMs : isDeleting ? deletingMs : pauseMs;

    const id = window.setTimeout(() => {
      if (phase === 'typing') {
        const nextCursor = Math.min(cursor + 1, current.length);
        setCursor(nextCursor);
        if (nextCursor >= current.length) setPhase('pausing');
        return;
      }

      if (phase === 'pausing') {
        setPhase('deleting');
        return;
      }

      const nextCursor = Math.max(cursor - 1, 0);
      setCursor(nextCursor);
      if (nextCursor <= 0) {
        setPhase('typing');
        setTermIdx((idx) => (idx + 1) % safeTerms.length);
      }
    }, tickMs);

    return () => window.clearTimeout(id);
  }, [
    cursor,
    deletingMs,
    pauseMs,
    phase,
    reducedMotion,
    safeTerms,
    termIdx,
    typingMs,
  ]);

  const current = safeTerms[termIdx] ?? '';
  const visibleSuffix = reducedMotion ? current : current.slice(0, cursor);

  return (
    <span className="inline-flex items-center">
      <span>{prefix}</span>
      <span>{visibleSuffix}</span>
      <span
        aria-hidden="true"
        className="ml-0.5 inline-block h-[1em] w-[1.5px] bg-brand-muted/80 align-[-0.15em] motion-reduce:opacity-60"
        style={
          reducedMotion
            ? undefined
            : { animation: 'bbTypingCaret 1s steps(1, end) infinite' }
        }
      />
      <style jsx>{`
        @keyframes bbTypingCaret {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </span>
  );
}

