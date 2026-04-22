import { useMemo } from 'react';
import type { Camera } from '../core/types';
import { clamp } from '../core/utils';
import { computeAdaptiveSteps } from '../core/steps';

type Props = {
  camera: Camera;
  /**
   * 点阵间距（世界坐标）
   * - number：固定间距
   * - 'auto'：跟随 zoom 自适应（与标尺/网格同源）
   */
  dotSpacing: number | 'auto';
  dotRadiusPx: number;
  dotAlpha: number;
};

export function BackgroundDots({ camera, dotSpacing, dotRadiusPx, dotAlpha }: Props) {
  const pattern = useMemo(() => {
    const z = camera.zoom;
    const spacingWorld = dotSpacing === 'auto' ? computeAdaptiveSteps(z).minorStepWorld : dotSpacing;
    const spacingPx = Math.max(6, spacingWorld * z);
    const offX = ((-camera.x * z) % spacingPx + spacingPx) % spacingPx;
    const offY = ((-camera.y * z) % spacingPx + spacingPx) % spacingPx;
    const r = dotRadiusPx * Math.max(0.9, Math.min(1.6, Math.sqrt(z)));
    return { spacingPx, offX, offY, r };
  }, [camera.x, camera.y, camera.zoom, dotSpacing, dotRadiusPx]);

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="dotPattern"
          width={pattern.spacingPx}
          height={pattern.spacingPx}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${pattern.offX}, ${pattern.offY})`}
        >
          <circle
            cx={pattern.spacingPx / 2}
            cy={pattern.spacingPx / 2}
            r={pattern.r}
            fill="var(--im-map-dot, var(--map-dot))"
            opacity={clamp(dotAlpha / 0.18, 0, 1)}
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#dotPattern)" />
    </svg>
  );
}
