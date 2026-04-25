import { useMemo, type CSSProperties } from 'react';
import { themeOverrideToCSSVars, type InfiniteMapTheme } from '../theme';

/**
 * 主题注入策略：
 * - base(light/dark) 由 theme-base.css 提供，通过 data-im-theme 切换
 * - 这里只注入 override（减少 inline vars 数量）
 */
export function useInjectedThemeVars(theme?: Partial<InfiniteMapTheme>): CSSProperties | undefined {
  return useMemo(() => {
    if (!theme) return undefined;
    return themeOverrideToCSSVars(theme as InfiniteMapTheme) as unknown as CSSProperties;
  }, [theme]);
}
