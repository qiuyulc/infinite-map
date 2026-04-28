import { memo, useMemo } from 'react';
import { clamp } from '../core/utils';
import { computeAdaptiveSteps } from '../core/steps';

type Props = {
  zoom: number;
  /**
   * 网格间距（世界坐标）
   * - number：固定间距
   * - 'auto'：跟随 zoom 自适应（与标尺同源）
   */
  gridSpacing: number | 'auto';
  gridAlpha: number;
  /**
   * 线宽（屏幕像素）
   * - 会按 zoom 折算为世界单位，保证视觉线宽相对稳定
   */
  lineWidthPx?: number;
};

/**
 * 世界坐标背景（用于 ViewportLayer 内部）
 * - 不依赖 camera.x/y，因此 pan 时不需要重算
 * - 随 ViewportLayer transform 一起移动/缩放
 */
export const BackgroundGridWorld = memo(function BackgroundGridWorld({
  zoom,
  gridSpacing,
  gridAlpha,
  lineWidthPx = 1,
}: Props) {
  const pattern = useMemo(() => {
    const z = zoom || 1;
    const spacingWorld = gridSpacing === 'auto' ? computeAdaptiveSteps(z).minorStepWorld : gridSpacing;
    const strokeWorld = lineWidthPx / z;
    const half = strokeWorld % 2 === 0 ? 0 : strokeWorld / 2;
    return { spacingWorld, strokeWorld, half };
  }, [gridSpacing, lineWidthPx, zoom]);

  const strokeOpacity = clamp(gridAlpha / 0.14, 0, 1);

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="gridPatternWorld"
          width={pattern.spacingWorld}
          height={pattern.spacingWorld}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${pattern.half} 0 V ${pattern.spacingWorld} M 0 ${pattern.half} H ${pattern.spacingWorld}`}
            stroke="var(--im-map-grid, var(--map-grid, var(--map-dot)))"
            strokeWidth={pattern.strokeWorld}
            strokeOpacity={strokeOpacity}
            shapeRendering="crispEdges"
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#gridPatternWorld)" />
    </svg>
  );
});

