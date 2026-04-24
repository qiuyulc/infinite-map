// UI kit 子入口：仅包含“渲染层”默认皮肤与基础组件（不包含编辑器 HUD/插件）
export { BackgroundDots } from '../components/BackgroundDots';
export { BackgroundGrid } from '../components/BackgroundGrid';
export { DefaultNode } from '../components/DefaultNode';
export { InfiniteMapThemeProvider } from '../components/InfiniteMapThemeProvider';

export type { InfiniteMapTheme } from '../theme';
export { lightTheme, darkTheme, mergeTheme, themeToCSSVars, themeOverrideToCSSVars } from '../theme';
