import { useMemo } from 'react';
import type { Camera } from '../core/types';
import { clamp } from '../core/utils';
import { computeAdaptiveSteps } from '../core/steps';

type Props = {
  camera: Camera;
  /**
   * 网格间距（世界坐标）
   * - number：固定间距
   * - 'auto'：跟随 zoom 自适应（与标尺同源）
   */
  gridSpacing: number | 'auto';
  gridAlpha: number;
  lineWidthPx?: number;
};

export function BackgroundGrid({ camera, gridSpacing, gridAlpha, lineWidthPx = 1 }: Props) {
  const pattern = useMemo(() => {
    const z = camera.zoom;
    const spacingWorld =
      gridSpacing === 'auto' ? computeAdaptiveSteps(z).minorStepWorld : gridSpacing;
    const spacingPx = Math.max(6, spacingWorld * z);
    const offX = ((-camera.x * z) % spacingPx + spacingPx) % spacingPx;
    const offY = ((-camera.y * z) % spacingPx + spacingPx) % spacingPx;
    return { spacingPx, offX, offY };
  }, [camera.x, camera.y, camera.zoom, gridSpacing]);

  const strokeOpacity = clamp(gridAlpha / 0.14, 0, 1);
  const half = lineWidthPx % 2 === 1 ? 0.5 : 0;

  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        <pattern
          id="gridPattern"
          width={pattern.spacingPx}
          height={pattern.spacingPx}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${pattern.offX}, ${pattern.offY})`}
        >
          <path
            d={`M ${half} 0 V ${pattern.spacingPx} M 0 ${half} H ${pattern.spacingPx}`}
            stroke="var(--im-map-grid, var(--map-grid, var(--map-dot)))"
            strokeWidth={lineWidthPx}
            strokeOpacity={strokeOpacity}
            shapeRendering="crispEdges"
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#gridPattern)" />
    </svg>
  );
}
