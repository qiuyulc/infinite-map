import { memo, useEffect, useRef } from 'react';
import type { Camera } from '../core/types';
import { computeAdaptiveSteps } from '../core/steps';
import { clamp } from '../core/utils';
import type { EngineStore } from '../engine';

type Props = {
  store: EngineStore;
  backgroundMode: 'dots' | 'grid' | 'none';
  dotSpacing: number | 'auto';
  dotRadiusPx: number;
  dotAlpha: number;
  gridSpacing: number | 'auto';
  gridAlpha: number;
  zIndex?: number;
};

export const EngineBackgroundLayer = memo(function EngineBackgroundLayer({
  store,
  backgroundMode,
  dotSpacing,
  dotRadiusPx,
  dotAlpha,
  gridSpacing,
  gridAlpha,
  zIndex = 0,
}: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (backgroundMode === 'none') return;
    const el = elRef.current;
    if (!el) return;

    let raf: number | null = null;
    let pending: Camera | null = null;

    const mod = (n: number, m: number) => ((n % m) + m) % m;

    const apply = () => {
      raf = null;
      const cam = pending ?? (store.getState().view as Camera);
      pending = null;

      const z = cam.zoom || 1;
      const steps = computeAdaptiveSteps(z);

      const spacingWorld =
        backgroundMode === 'grid'
          ? gridSpacing === 'auto'
            ? steps.minorStepWorld
            : gridSpacing
          : dotSpacing === 'auto'
            ? steps.minorStepWorld
            : dotSpacing;

      const spacingPx = Math.max(2, spacingWorld * z);
      const vp = store.getState().viewport;
      const ox = mod(vp.w / 2 - cam.x * z, spacingPx);
      const oy = mod(vp.h / 2 - cam.y * z, spacingPx);

      el.style.backgroundRepeat = 'repeat';
      el.style.backgroundSize = `${spacingPx}px ${spacingPx}px`;
      el.style.backgroundPosition = `${ox}px ${oy}px`;

      if (backgroundMode === 'grid') {
        const alphaPct = clamp(gridAlpha, 0, 1) * 100;
        const gridColor = `color-mix(in srgb, var(--im-map-grid, var(--map-grid, var(--map-dot))) ${alphaPct}%, transparent)`;
        el.style.backgroundImage = `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`;
      } else if (backgroundMode === 'dots') {
        const alphaPct = clamp(dotAlpha, 0, 1) * 100;
        const dotColor = `color-mix(in srgb, var(--im-map-dot, var(--map-dot)) ${alphaPct}%, transparent)`;
        const r = dotRadiusPx * clamp(Math.sqrt(z), 0.9, 1.6);
        el.style.backgroundImage = `radial-gradient(circle, ${dotColor} ${r}px, transparent ${r}px)`;
      }
    };

    const un = store.subscribe(
      (s) => s.view,
      (view) => {
        pending = view as Camera;
        if (raf != null) return;
        raf = requestAnimationFrame(apply);
      },
      { equalityFn: () => false }
    );

    // init
    apply();

    return () => {
      un?.();
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [backgroundMode, dotAlpha, dotRadiusPx, dotSpacing, gridAlpha, gridSpacing, store]);

  if (backgroundMode === 'none') return null;
  return <div ref={elRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex }} aria-hidden="true" />;
});
