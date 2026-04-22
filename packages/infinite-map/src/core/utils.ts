export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function cssVarRgb(name: string, fallback: string) {
  // 期望格式："R G B"
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const raw = v || fallback;
  // Canvas 的 rgba() 需要逗号分隔：rgba(55,90,110,0.1)
  // 我们的变量存的是 "55 90 110"，这里统一转换。
  return raw.includes(',') ? raw : raw.replace(/\s+/g, ', ');
}

export function cssVarNum(name: string, fallback: number) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

