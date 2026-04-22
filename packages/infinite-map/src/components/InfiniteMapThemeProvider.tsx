import type { CSSProperties, PropsWithChildren } from 'react';
import { darkTheme, lightTheme, mergeTheme, themeToCSSVars, type InfiniteMapTheme } from '../theme';

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
  const resolved = mergeTheme(base === 'dark' ? darkTheme : lightTheme, theme);
  const vars = themeToCSSVars(resolved) as unknown as CSSProperties;
  return (
    // 默认使用 display: contents，避免 ThemeProvider 额外包一层导致布局高度/宽度发生变化
    // 同时 CSS vars 仍然可以向下继承给 InfiniteMap 内部使用。
    <div className={className} style={{ display: 'contents', ...vars, ...style }}>
      {children}
    </div>
  );
}
