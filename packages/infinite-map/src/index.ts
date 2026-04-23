/**
 * 包入口（统一导出）
 *
 * 说明：
 * - 这里会把 core/editor/ui/demo 都统一从 `@qiuyulc/infinite-map` 导出，方便使用者一个入口拿全。
 * - 同时仍保留子路径入口（推荐按层使用，便于未来拆包）：
 *   - `@qiuyulc/infinite-map/ui`
 *   - `@qiuyulc/infinite-map/demo`
 */

// -----------------------------------------------------------------------------
// Core（核心组件 + 基础类型/工具）
// -----------------------------------------------------------------------------

// 核心组件
export { InfiniteMap } from './components/InfiniteMap';
export type { InfiniteMapProps, InfiniteMapApi } from './components/InfiniteMap';

// 基础类型 / 几何
export type { Camera, NodeData, Rect } from './core/types';
export { rectIntersects } from './core/types';

// 布局（纯计算）
export { computeLayout } from './layout/layoutPresets';
export type { LayoutPreset, LayoutOptions } from './layout/layoutPresets';

// -----------------------------------------------------------------------------
// Editor（插件系统与编辑器能力，UI 无关）
// -----------------------------------------------------------------------------

export { composePlugins } from './editor/composePlugins';
export { createDefaultEditorPlugins } from './editor/createDefaultEditorPlugins';
export type { DefaultEditorOptions } from './editor/createDefaultEditorPlugins';

export type { InfiniteMapPlugin, MapContext, NodePatch, ChangeMeta } from './editor/types';

// 插件集合（按需引用：EditorPlugins.transform / EditorPlugins.hud / ...）
export * as EditorPlugins from './editor/plugins';

// -----------------------------------------------------------------------------
// UI Kit（默认皮肤/组件/HUD 插件）
// -----------------------------------------------------------------------------
// 既支持从主入口拿：import { InfiniteMapThemeProvider } from '@qiuyulc/infinite-map'
// 也支持子路径更清晰：import { InfiniteMapThemeProvider } from '@qiuyulc/infinite-map/ui'
export * from './ui';

// -----------------------------------------------------------------------------
// Demo（仅建议用于 playground/文档示例，不建议业务依赖）
// -----------------------------------------------------------------------------
// 同样支持主入口与子路径两种用法：
// - import { makeDemoNodes } from '@qiuyulc/infinite-map'
// - import { makeDemoNodes } from '@qiuyulc/infinite-map/demo'
export * from './demo';
