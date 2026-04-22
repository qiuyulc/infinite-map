export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function cssVarTarget(el?: Element | null) {
  return el ?? document.documentElement;
}

/**
 * 读取 CSS 变量
 * - 默认从 document.documentElement 读取（兼容旧用法）
 * - 若组件库把 vars 挂在局部容器上（如 ThemeProvider），请传入就近的元素（canvas/div），以便正确继承
 */
export function cssVar(name: string, fallback: string, el?: Element | null) {
  const v = getComputedStyle(cssVarTarget(el)).getPropertyValue(name).trim();
  return v || fallback;
}

export function cssVarRgb(name: string, fallback: string, el?: Element | null) {
  // 期望格式："R G B"
  const v = getComputedStyle(cssVarTarget(el)).getPropertyValue(name).trim();
  const raw = v || fallback;
  // Canvas 的 rgba() 需要逗号分隔：rgba(55,90,110,0.1)
  // 我们的变量存的是 "55 90 110"，这里统一转换。
  return raw.includes(',') ? raw : raw.replace(/\s+/g, ', ');
}

export function cssVarNum(name: string, fallback: number, el?: Element | null) {
  const v = getComputedStyle(cssVarTarget(el)).getPropertyValue(name).trim();
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
