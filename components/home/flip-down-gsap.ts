import { gsap } from 'gsap';

type FlipDownOptions = {
  delay?: number;
  stagger?: number;
  duration?: number;
};

export function animateFlipDown(
  scope: HTMLElement,
  perspectiveParent: HTMLElement,
  targets: Element[],
  options: FlipDownOptions = {},
): gsap.Context | null {
  if (!targets.length) return null;

  const { delay = 0.2, stagger = 0.12, duration = 0.7 } = options;
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  return gsap.context(() => {
    if (reducedMotion) {
      gsap.set(targets, {
        rotationX: 0,
        opacity: 1,
        y: 0,
        clearProps: 'transform',
      });
      return;
    }

    gsap.set(perspectiveParent, { perspective: 900 });
    gsap.fromTo(
      targets,
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
        duration,
        stagger,
        ease: 'back.out(1.35)',
        delay,
      },
    );
  }, scope);
}
