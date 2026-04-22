import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { MapContext } from '../../types';
import { computeAdaptiveSteps } from '../../../core/steps';
import { clamp } from '../../../core/utils';

type Tick = { posPx: number; major: boolean; label?: string };

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function formatValue(v: number) {
  // 对整数/接近整数的值更友好
  const r0 = Math.round(v);
  if (Math.abs(v - r0) < 1e-6) return String(r0);
  // 根据数量级决定小数位
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function buildTicks(
  startWorld: number,
  endWorld: number,
  zoom: number,
  opts: { majorStepWorld: number; minorCount: number; labelEveryMajor: number }
): { stepWorld: number; ticks: Tick[] } {
  const majorStepWorld = opts.majorStepWorld;
  const minorCount = Math.max(1, Math.floor(opts.minorCount));
  const minorStepWorld = majorStepWorld / minorCount;
  const labelEveryMajor = Math.max(1, Math.floor(opts.labelEveryMajor));

  const stepWorld = minorStepWorld;
  const ticks: Tick[] = [];
  const firstK = Math.floor(startWorld / minorStepWorld);
  const first = firstK * minorStepWorld;
  // 额外多画一个防止边界缺线
  const maxN = Math.ceil((endWorld - first) / minorStepWorld) + 2;
  for (let i = 0; i < maxN; i++) {
    const k = firstK + i;
    const w = k * minorStepWorld;
    if (w < startWorld - minorStepWorld) continue;
    if (w > endWorld + minorStepWorld) break;
    const px = (w - startWorld) * zoom;
    const major = mod(k, minorCount) === 0;
    const majorIndex = Math.floor(k / minorCount);
    const label = major && mod(majorIndex, labelEveryMajor) === 0 ? formatValue(w) : undefined;
    ticks.push({ posPx: px, major, label });
  }
  return { stepWorld, ticks };
}

export type RulersOverlayProps = {
  ctx: MapContext;
  thickness?: number; // px
};

export function RulersOverlay({ ctx, thickness = 24 }: RulersOverlayProps) {
  const cam = ctx.getCamera();
  const vp = ctx.getViewport();
  const z = cam.zoom || 1;
  const valid = vp.w > 0 && vp.h > 0 && isFinite(z) && z > 0;

  // 标尺本身覆盖在画布上方/左侧，但不影响“画布坐标系”。
  // 为了让刻度与画布内容对齐：刻度从 (thickness, thickness) 之后开始标注。
  const viewStartX = valid ? cam.x + thickness / z : 0;
  const viewEndX = valid ? cam.x + vp.w / z : 0;
  const viewStartY = valid ? cam.y + thickness / z : 0;
  const viewEndY = valid ? cam.y + vp.h / z : 0;

  // 让刻度/数字密度随 zoom 自适应：
  // - zoom 越大：tick 更密、数字更密
  // - zoom 越小：tick 更疏、数字更疏
  const { majorStepWorld, minorCount } = computeAdaptiveSteps(z);

  // 标签频率：只跟 zoom/step 相关，不随平移改变，避免“边移动边跳变哪些数字显示”
  const zoomFactor = Math.sqrt(z);
  const labelMinGapPx = clamp(28 / zoomFactor, 16, 44);

  const h = useMemo(() => {
    const labelEveryMajor = Math.max(1, Math.ceil(labelMinGapPx / Math.max(majorStepWorld * z, 1e-6)));
    return buildTicks(viewStartX, viewEndX, z, { majorStepWorld, minorCount, labelEveryMajor });
  }, [labelMinGapPx, majorStepWorld, minorCount, viewEndX, viewStartX, z]);

  const v = useMemo(() => {
    const labelEveryMajor = Math.max(1, Math.ceil(labelMinGapPx / Math.max(majorStepWorld * z, 1e-6)));
    return buildTicks(viewStartY, viewEndY, z, { majorStepWorld, minorCount, labelEveryMajor });
  }, [labelMinGapPx, majorStepWorld, minorCount, viewEndY, viewStartY, z]);

  const baseSvgStyle: CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    background: 'var(--im-ruler-bg, rgba(255,255,255,0.75))',
  };

  const tickStroke = 'var(--im-ruler-tick, rgba(15,23,42,0.35))';
  const textFill = 'var(--im-ruler-text, rgba(15,23,42,0.70))';

  const fontSize = 9;
  // 刻度朝“外侧”（远离画布内容）绘制：
  // - 顶部标尺：从 y=0 向下画到 major/minor 长度，不贴近底边（内侧）
  // - 左侧标尺：从 x=0 向右画到 major/minor 长度，不贴近右边（内侧）
  // 预留出“数字区域”，避免被 svg 高度裁剪
  const labelAreaPx = fontSize + 6;
  const tickMajorLen = Math.max(8, thickness - labelAreaPx);
  const tickMinorLen = Math.max(5, tickMajorLen - 3);
  const hLabelY = tickMajorLen + 2; // 顶部：数字在刻度线正下方（在同一个 svg 内）
  // 左侧：数字竖排读（-90deg），但位置在刻度线右边
  const vLabelX = Math.min(thickness - 2, tickMajorLen + 4);

  if (!valid) return null;

  return (
    <>
      {/* corner */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: thickness,
          height: thickness,
          background: 'var(--im-ruler-bg, rgba(255,255,255,0.75))',
          pointerEvents: 'none',
        }}
      />

      {/* horizontal */}
      <svg width="100%" height={thickness} style={{ ...baseSvgStyle, left: 0, top: 0 }} aria-hidden="true">
        {h.ticks.map((t, idx) => {
          const x = Math.round(t.posPx + thickness) + 0.5;
          const y1 = 0.5;
          const y2 = (t.major ? tickMajorLen : tickMinorLen) + 0.5;
          return (
            <line
              key={idx}
              x1={x}
              y1={y1}
              x2={x}
              y2={y2}
              stroke={tickStroke}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          );
        })}
        {h.ticks
          .filter((t) => t.label)
          .map((t, idx) => {
            const x = Math.round(t.posPx + thickness) + 0.5;
            if (x < thickness + 2) return null;
            return (
              // 顶部：数字在刻度线“正下方”
              <text
                key={`ht-${idx}`}
                x={x}
                y={hLabelY}
                fontSize={fontSize}
                fill={textFill}
                textAnchor="middle"
                dominantBaseline="hanging"
                style={{ userSelect: 'none' }}
              >
                {t.label}
              </text>
            );
          })}
      </svg>

      {/* vertical */}
      <svg width={thickness} height="100%" style={{ ...baseSvgStyle, left: 0, top: 0 }} aria-hidden="true">
        {v.ticks.map((t, idx) => {
          const y = Math.round(t.posPx + thickness) + 0.5;
          const x1 = 0.5;
          const x2 = (t.major ? tickMajorLen : tickMinorLen) + 0.5;
          return (
            <line
              key={idx}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={tickStroke}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          );
        })}
        {v.ticks
          .filter((t) => t.label)
          .map((t, idx) => {
            const y = Math.round(t.posPx + thickness) + 0.5;
            if (y < thickness + 2) return null;
            return (
              <text
                key={`vt-${idx}`}
                x={vLabelX}
                y={y}
                fontSize={fontSize}
                fill={textFill}
                style={{ userSelect: 'none' }}
                textAnchor="middle"
                dominantBaseline="hanging"
                transform={`rotate(-90 ${vLabelX} ${y})`}
              >
                {t.label}
              </text>
            );
          })}
      </svg>
    </>
  );
}

