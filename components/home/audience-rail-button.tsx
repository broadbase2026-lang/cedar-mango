'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const REPEL_RADIUS = 140;
const MAX_OFFSET = 28;

function cn(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(' ');
}

type AudienceRailButtonProps = {
  label: string;
  side: 'left' | 'right';
  onClick: () => void;
  ariaLabel: string;
  animatePosition?: boolean;
  style?: React.CSSProperties;
};

export function AudienceRailButton({
  label,
  side,
  onClick,
  ariaLabel,
  animatePosition = false,
  style,
}: AudienceRailButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isRepellingRef = useRef(false);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) return;

    let snapTween: gsap.core.Tween | null = null;

    const snapBack = () => {
      snapTween?.kill();
      snapTween = gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.55,
        ease: 'elastic.out(1, 0.55)',
        overwrite: 'auto',
      });
      isRepellingRef.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < REPEL_RADIUS && dist > 0) {
        isRepellingRef.current = true;
        snapTween?.kill();
        const t = 1 - dist / REPEL_RADIUS;
        const force = t * t * MAX_OFFSET;
        gsap.to(button, {
          x: (-dx / dist) * force,
          y: (-dy / dist) * force,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        return;
      }

      if (isRepellingRef.current) {
        snapBack();
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      snapTween?.kill();
      gsap.set(button, { x: 0, y: 0 });
    };
  }, []);

  return (
    <div
      className={cn(
        'absolute bottom-6 z-50 hidden md:block md:bottom-8',
        side === 'left' ? 'left-6 md:left-8' : 'right-6 md:right-8',
        animatePosition &&
          'transition-[left,right,bottom] ease-in-out motion-reduce:transition-none',
      )}
      style={style}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(
          'flex h-20 w-20 items-center justify-center rounded-full',
          'bg-accent text-[11px] font-bold uppercase tracking-[0.12em] text-text-inverse',
          'shadow-media-soft ring-1 ring-inset ring-white/20',
          'transition-colors hover:bg-accent-hover',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2',
        )}
      >
        {label}
      </button>
    </div>
  );
}
