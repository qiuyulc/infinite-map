import { clamp } from './utils';

export function niceStep(raw: number) {
  if (!isFinite(raw) || raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  if (n <= 1) return 1 * pow;
  if (n <= 2) return 2 * pow;
  if (n <= 5) return 5 * pow;
  return 10 * pow;
}

/**
 * 计算“编辑器风格”的自适应刻度/网格步长（世界坐标）
 * - 目标：随 zoom 变化，但保持视觉密度稳定（像素间距稳定）
 * - 同一套算法建议同时用于：标尺主刻度、网格间距、网格吸附步长
 */
export function computeAdaptiveSteps(
  zoom: number,
  opts: {
    /**
     * 主刻度目标像素间距
     * - 默认 84px（经验值）
     */
    majorTargetPx?: number;
    /**
     * 小刻度数量（major/minor）
     * - 默认 5；zoom 很大时可提升到 10
     */
    minorCount?: number;
  } = {}
) {
  const z = zoom || 1;
  const zoomFactor = Math.sqrt(z);

  // 让刻度/网格密度随 zoom 自适应：zoom 越大，主格略微更密；zoom 越小，主格略微更疏
  const baseMajorTargetPx = opts.majorTargetPx ?? 84;
  const majorTargetPx = clamp(baseMajorTargetPx / zoomFactor, 52, 140);
  const majorStepWorld = niceStep(majorTargetPx / Math.max(z, 1e-6));

  let minorCount = opts.minorCount ?? (z >= 2.3 ? 10 : 5);
  // 避免小格像素过密导致糊成一片：保证 minor >= 7px
  const minorPx = (majorStepWorld * z) / minorCount;
  if (minorPx < 7 && minorCount > 5) minorCount = 5;

  const minorStepWorld = majorStepWorld / minorCount;

  return { majorStepWorld, minorStepWorld, minorCount, majorTargetPx };
}

