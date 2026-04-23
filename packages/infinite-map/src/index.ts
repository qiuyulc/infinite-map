export { InfiniteMap } from './components/InfiniteMap';
export type { InfiniteMapProps } from './components/InfiniteMap';
export type { InfiniteMapApi } from './components/InfiniteMap';

export type { Camera, NodeData, Rect } from './core/types';
export { rectIntersects } from './core/types';

export { computeLayout } from './layout/layoutPresets';
export type { LayoutPreset, LayoutOptions } from './layout/layoutPresets';

// editor（可选使用）
export { createDefaultEditorPlugins } from './editor/createDefaultEditorPlugins';
export type { DefaultEditorOptions } from './editor/createDefaultEditorPlugins';
export { composePlugins } from './editor/composePlugins';
export type { InfiniteMapPlugin, MapContext, NodePatch, ChangeMeta } from './editor/types';
export * as EditorPlugins from './editor/plugins';

// demo（建议仅用于 playground/示例）
// - 通过子路径导出：@qiuyulc/infinite-map/demo
