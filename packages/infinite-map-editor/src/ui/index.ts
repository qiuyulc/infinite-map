// UI kit 子入口：包含默认皮肤与 HUD 插件（依赖 core 包的基础组件/主题）
export { BackgroundDots, BackgroundGrid, DefaultNode, InfiniteMapThemeProvider } from '@qiuyulc/infinite-map';
export type { InfiniteMapTheme } from '@qiuyulc/infinite-map';
export { lightTheme, darkTheme, mergeTheme, themeToCSSVars, themeOverrideToCSSVars } from '@qiuyulc/infinite-map';

// HUD plugins（可选 UI）
export { createToolbarPlugin } from '../editor/plugins/hud/createToolbarPlugin';
export { createDefaultContextMenuPlugin } from '../editor/plugins/hud/createDefaultContextMenuPlugin';
export { createMinimapPlugin } from '../editor/plugins/hud/createMinimapPlugin';
export { createRulersPlugin } from '../editor/plugins/hud/createRulersPlugin';
export { createZoomDockPlugin } from '../editor/plugins/hud/createZoomDockPlugin';

// 默认编辑器（带 UI）
export { createDefaultEditorPluginsWithUI } from './createDefaultEditorPluginsWithUI';
export type { DefaultEditorWithUIOptions } from './createDefaultEditorPluginsWithUI';

