import { useEffect, useState, type CSSProperties, type PropsWithChildren } from 'react';
import { darkTheme, lightTheme, mergeTheme, themeToCSSVars, type InfiniteMapTheme } from '../theme';
import { ThemeVersionContext } from '../hooks/useThemeVersion';

export type InfiniteMapThemeProviderProps = PropsWithChildren<{
  /**
   * 基础主题
   * - 默认 light
   */
  base?: 'light' | 'dark';
  /**
   * 覆盖部分 token（会与 base 合并）
   */
  theme?: Partial<InfiniteMapTheme>;
  className?: string;
  style?: CSSProperties;
}>;

export function InfiniteMapThemeProvider({ base = 'light', theme, className, style, children }: InfiniteMapThemeProviderProps) {
  // 当 base/theme 变化时，递增版本号（用于触发 Canvas 重绘）
  const [themeVersion, setThemeVersion] = useState(0);
  useEffect(() => {
    setThemeVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, theme]);

  const resolved = mergeTheme(base === 'dark' ? darkTheme : lightTheme, theme);
  const vars = themeToCSSVars(resolved) as unknown as CSSProperties;
  return (
    // 默认使用 display: contents，避免 ThemeProvider 额外包一层导致布局高度/宽度发生变化
    // 同时 CSS vars 仍然可以向下继承给 InfiniteMap 内部使用。
    <ThemeVersionContext.Provider value={themeVersion}>
      <div className={className} style={{ display: 'contents', ...vars, ...style }}>
        {children}
      </div>
    </ThemeVersionContext.Provider>
  );
}
