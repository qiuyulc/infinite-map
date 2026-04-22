import { createContext, useContext, useEffect, useState } from 'react';

/**
 * 主题版本号上下文（用于 Canvas 组件在主题切换时触发重绘）
 * - 由 InfiniteMapThemeProvider 提供（推荐）
 * - 若未提供，则 useThemeVersion 会退回到旧的 documentElement 监听策略
 */
export const ThemeVersionContext = createContext<number | null>(null);

/**
 * 主题变化版本号（用于触发 Canvas 重绘）
 * - data-theme 属性变化
 * - prefers-color-scheme 变化
 */
export function useThemeVersion() {
  const ctxVersion = useContext(ThemeVersionContext);
  if (typeof ctxVersion === 'number') return ctxVersion;

  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const mo = new MutationObserver(() => setThemeVersion((v) => v + 1));
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onMql = () => setThemeVersion((v) => v + 1);
    if (mql?.addEventListener) mql.addEventListener('change', onMql);
    else if (mql?.addListener) mql.addListener(onMql);

    return () => {
      mo.disconnect();
      if (mql?.removeEventListener) mql.removeEventListener('change', onMql);
      else if (mql?.removeListener) mql.removeListener(onMql);
    };
  }, []);

  return themeVersion;
}
