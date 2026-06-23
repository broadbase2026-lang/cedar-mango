'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';
import { NAV_GRADIENT_STOPS_START } from '@/components/home/feature-card-gradients';

const [COLOR1, COLOR2, COLOR3] = NAV_GRADIENT_STOPS_START;

class ShaderGradientErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function AudienceOverlayShader() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 size-full"
    >
      <ShaderGradientCanvas
        className="size-full"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        pixelDensity={1.25}
        fov={45}
        pointerEvents="none"
        lazyLoad={false}
      >
        <ShaderGradient
          control="props"
          type="plane"
          animate="on"
          color1={COLOR1}
          color2={COLOR2}
          color3={COLOR3}
          uSpeed={0.4}
          uStrength={4}
          uFrequency={5.5}
          uDensity={1.3}
          cDistance={3.6}
          cPolarAngle={90}
          cAzimuthAngle={180}
          positionX={-1.4}
          positionY={0}
          positionZ={0}
          rotationX={0}
          rotationY={10}
          rotationZ={50}
          lightType="3d"
          brightness={1.2}
          grain="off"
        />
      </ShaderGradientCanvas>
    </div>
  );
}

export function AudienceOverlayGradient() {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  if (reducedMotion) return null;

  return (
    <ShaderGradientErrorBoundary>
      <AudienceOverlayShader />
    </ShaderGradientErrorBoundary>
  );
}
