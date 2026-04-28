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
 * 世界坐标背景（用于 “viewport transform” 架构）
 * - 不依赖 camera.x/y：平移完全跟随外层 viewport 的 transform
 * - 仅依赖 zoom：用于自适应计算 spacing
 */
export const BackgroundGridWorld = memo(function BackgroundGridWorld({ zoom, gridSpacing, gridAlpha, lineWidthPx = 1 }: Props) {
  const z = zoom || 1;
  const { spacingWorld, strokeWorld } = useMemo(() => {
    const spacing = gridSpacing === 'auto' ? computeAdaptiveSteps(z).minorStepWorld : gridSpacing;
    return { spacingWorld: spacing, strokeWorld: lineWidthPx / z };
  }, [gridSpacing, lineWidthPx, z]);

  const strokeOpacity = clamp(gridAlpha / 0.14, 0, 1);

  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        <pattern id="im-gridPatternWorld" width={spacingWorld} height={spacingWorld} patternUnits="userSpaceOnUse">
          <path
            d={`M 0 0 V ${spacingWorld} M 0 0 H ${spacingWorld}`}
            stroke="var(--im-map-grid, var(--map-grid, var(--map-dot)))"
            strokeWidth={strokeWorld}
            strokeOpacity={strokeOpacity}
            shapeRendering="crispEdges"
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#im-gridPatternWorld)" />
    </svg>
  );
});

