import { useEffect, useState } from 'react';

/**
 * 主题变化版本号（用于触发 Canvas 重绘）
 * - data-theme 属性变化
 * - prefers-color-scheme 变化
 */
export function useThemeVersion() {
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

