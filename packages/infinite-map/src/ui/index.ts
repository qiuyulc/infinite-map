// UI kit 子入口：包含默认皮肤与 HUD 插件
export { Minimap } from '../components/Minimap';
export { BackgroundDots } from '../components/BackgroundDots';
export { BackgroundGrid } from '../components/BackgroundGrid';
export { DefaultNode } from '../components/DefaultNode';
export { InfiniteMapThemeProvider } from '../components/InfiniteMapThemeProvider';

export type { InfiniteMapTheme } from '../theme';
export { lightTheme, darkTheme, mergeTheme, themeToCSSVars } from '../theme';

// HUD plugins（可选 UI）
export { createToolbarPlugin } from '../editor/plugins/hud/createToolbarPlugin';
export { createDefaultContextMenuPlugin } from '../editor/plugins/hud/createDefaultContextMenuPlugin';
export { createMinimapPlugin } from '../editor/plugins/hud/createMinimapPlugin';
export { createRulersPlugin } from '../editor/plugins/hud/createRulersPlugin';
export { createZoomDockPlugin } from '../editor/plugins/hud/createZoomDockPlugin';

