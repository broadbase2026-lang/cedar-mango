'use client';

import { useEffect, useState } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import {
  NAV_GRADIENT_STOPS_START,
  SIGNUP_HERO_GRADIENT,
} from '@/components/home/feature-card-gradients';

const [COLOR1, COLOR2, COLOR3] = NAV_GRADIENT_STOPS_START;

export function AudienceOverlayGradient() {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: SIGNUP_HERO_GRADIENT }}
      />
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <ShaderGradientCanvas
        className="absolute inset-0 h-full w-full"
        style={{ position: 'absolute', inset: 0 }}
        pixelDensity={1.25}
        fov={45}
        pointerEvents="none"
      >
        <ShaderGradient
          control="props"
          type="plane"
          animate="on"
          color1={COLOR1}
          color2={COLOR2}
          color3={COLOR3}
          uSpeed={0.35}
          uStrength={3.2}
          uFrequency={4.5}
          uDensity={1.2}
          cDistance={28}
          cPolarAngle={95}
          cAzimuthAngle={180}
          lightType="3d"
          brightness={1.1}
          grain="off"
        />
      </ShaderGradientCanvas>
    </div>
  );
}
