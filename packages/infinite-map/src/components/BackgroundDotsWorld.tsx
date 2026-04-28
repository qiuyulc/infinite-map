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
  /**
   * 点半径（屏幕像素，最终会随 zoom 变化不大）
   * - 会按 zoom 折算为世界单位，保证视觉半径相对稳定
   */
  dotRadiusPx: number;
  dotAlpha: number;
};

/**
 * 世界坐标点阵背景（用于 ViewportLayer 内部）
 * - 不依赖 camera.x/y，因此 pan 时不需要重算
 * - 随 ViewportLayer transform 一起移动/缩放
 */
export const BackgroundDotsWorld = memo(function BackgroundDotsWorld({ zoom, dotSpacing, dotRadiusPx, dotAlpha }: Props) {
  const pattern = useMemo(() => {
    const z = zoom || 1;
    const spacingWorld = dotSpacing === 'auto' ? computeAdaptiveSteps(z).minorStepWorld : dotSpacing;
    // 让屏幕半径接近旧实现：rScreen ≈ dotRadiusPx * clamp(sqrt(z))
    const rScreen = dotRadiusPx * Math.max(0.9, Math.min(1.6, Math.sqrt(z)));
    const rWorld = rScreen / z;
    return { spacingWorld, rWorld };
  }, [dotRadiusPx, dotSpacing, zoom]);

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="dotPatternWorld"
          width={pattern.spacingWorld}
          height={pattern.spacingWorld}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={pattern.spacingWorld / 2}
            cy={pattern.spacingWorld / 2}
            r={pattern.rWorld}
            fill="var(--im-map-dot, var(--map-dot))"
            opacity={clamp(dotAlpha / 0.18, 0, 1)}
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#dotPatternWorld)" />
    </svg>
  );
});

