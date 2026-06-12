'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function FadeInScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) return;

    const contexts: gsap.Context[] = [];

    document.querySelectorAll<HTMLElement>('.fade-in-container').forEach(
      (container) => {
        const elements = Array.from(
          container.querySelectorAll('.fade-in-element'),
        ).filter((el) => el.closest('.fade-in-container') === container);
        if (!elements.length) return;

        const ctx = gsap.context(() => {
          gsap.fromTo(
            elements,
            { opacity: 0, y: 40 },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: 'power2.out',
              stagger: 0.2,
              scrollTrigger: {
                trigger: container,
                start: 'top 80%',
                toggleActions: 'play none none none',
              },
            },
          );
        }, container);

        contexts.push(ctx);
      },
    );

    ScrollTrigger.refresh();

    return () => {
      contexts.forEach((ctx) => ctx.revert());
    };
  }, []);

  return null;
}
