import { memo, useMemo } from 'react';
import { clamp } from '../core/utils';
import { computeAdaptiveSteps } from '../core/steps';

type Props = {
  zoom: number;
  /**
   * 点阵间距（世界坐标）
   * - number：固定间距
   * - 'auto'：跟随 zoom 自适应（与标尺/网格同源）
   */
  dotSpacing: number | 'auto';
  dotRadiusPx: number;
  dotAlpha: number;
};

/**
 * 世界坐标点阵背景（用于 “viewport transform” 架构）
 * - 不依赖 camera.x/y：平移完全跟随外层 viewport 的 transform
 * - 仅依赖 zoom：用于自适应计算 spacing/点大小
 */
export const BackgroundDotsWorld = memo(function BackgroundDotsWorld({ zoom, dotSpacing, dotRadiusPx, dotAlpha }: Props) {
  const z = zoom || 1;
  const { spacingWorld, rWorld } = useMemo(() => {
    const spacing = dotSpacing === 'auto' ? computeAdaptiveSteps(z).minorStepWorld : dotSpacing;
    // 让屏幕半径接近旧实现：rScreen ≈ dotRadiusPx * clamp(sqrt(z))
    const rScreen = dotRadiusPx * Math.max(0.9, Math.min(1.6, Math.sqrt(z)));
    return { spacingWorld: spacing, rWorld: rScreen / z };
  }, [dotRadiusPx, dotSpacing, z]);

  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        <pattern id="im-dotPatternWorld" width={spacingWorld} height={spacingWorld} patternUnits="userSpaceOnUse">
          <circle
            cx={spacingWorld / 2}
            cy={spacingWorld / 2}
            r={rWorld}
            fill="var(--im-map-dot, var(--map-dot))"
            opacity={clamp(dotAlpha / 0.18, 0, 1)}
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#im-dotPatternWorld)" />
    </svg>
  );
});

