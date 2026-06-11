'use client';

import { useEffect, useRef, useState } from 'react';

const MOBILE_MQ = '(max-width: 639px)';
const SCROLL_THRESHOLD = 8;

/** Hide the portal header on mobile when scrolling down; show again when scrolling up. */
export function useMobileScrollHeaderHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    lastYRef.current = window.scrollY;

    const onScroll = () => {
      if (!mq.matches) {
        setHidden(false);
        return;
      }

      const y = window.scrollY;
      const delta = y - lastYRef.current;

      if (y < 16) {
        setHidden(false);
      } else if (delta > SCROLL_THRESHOLD) {
        setHidden(true);
      } else if (delta < -SCROLL_THRESHOLD) {
        setHidden(false);
      }

      lastYRef.current = y;
    };

    const onMqChange = () => {
      if (!mq.matches) setHidden(false);
      lastYRef.current = window.scrollY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onMqChange);

    return () => {
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onMqChange);
    };
  }, []);

  return hidden;
}
