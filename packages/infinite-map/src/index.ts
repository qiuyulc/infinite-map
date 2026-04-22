export { InfiniteMap } from './components/InfiniteMap';
export type { InfiniteMapProps } from './components/InfiniteMap';
export type { InfiniteMapApi } from './components/InfiniteMap';
export { Minimap } from './components/Minimap';
export { BackgroundDots } from './components/BackgroundDots';
export { BackgroundGrid } from './components/BackgroundGrid';
export { DefaultNode } from './components/DefaultNode';
export { InfiniteMapThemeProvider } from './components/InfiniteMapThemeProvider';

export type { InfiniteMapTheme } from './theme';
export { lightTheme, darkTheme, mergeTheme, themeToCSSVars } from './theme';

export type { Camera, NodeData, Rect } from './core/types';
export { rectIntersects } from './core/types';

export { computeLayout } from './layout/layoutPresets';
export type { LayoutPreset, LayoutOptions } from './layout/layoutPresets';

export { makeDemoNodes } from './demo/demoNodes';

// editor（可选使用）
export { createDefaultEditorPlugins } from './editor/createDefaultEditorPlugins';
export type { DefaultEditorOptions } from './editor/createDefaultEditorPlugins';
export { composePlugins } from './editor/composePlugins';
export type { InfiniteMapPlugin, NodePatch, ChangeMeta } from './editor/types';
export * as EditorPlugins from './editor/plugins';
