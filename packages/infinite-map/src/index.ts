/**
 * 包入口（统一导出）
 *
 * 说明：
 * - 本包只提供“渲染层（InfiniteMap）+ 基础类型/工具”。
 * - 编辑器能力已拆分到：`@qiuyulc/infinite-map-editor`。
 * - 同时仍保留子路径入口（更清晰）：
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

// 基础工具（editor/hud 会复用）
export { cameraForTopLeftOrigin, clamp, cssVar, cssVarNum, cssVarRgb } from './core/utils';
export { computeAdaptiveSteps } from './core/steps';

// 布局（纯计算）
export { computeLayout } from './layout/layoutPresets';
export type { LayoutPreset, LayoutOptions } from './layout/layoutPresets';

// -----------------------------------------------------------------------------
// Plugin Contract（类型与运行时：供 editor 包/社区插件复用）
// -----------------------------------------------------------------------------

// plugin contract types（editor 包会依赖这些类型）
export type {
  InfiniteMapPlugin,
  MapContext,
  NodePatch,
  ChangeMeta,
  Point,
  Command,
  HandlerResult,
  EventMap,
  EventKey,
  EditorErrorKind,
  EditorErrorInfo,
  // Scheme C：input pipeline
  HitTestTarget,
  HitTestContributor,
  HitTestContext,
  Gesture,
  GesturePhase,
  InputPipelineHooks,
  PointerDownProcessor,
  MapPointerEvent,
  MapWheelEvent,
  MapKeyEvent,
  MapContextMenuEvent,
} from './editor/types';

export {
  DOC_SCHEMA_VERSION,
  serializeDoc,
  parseDoc,
  type InfiniteMapDoc,
} from './editor/document';

// store keys/runtime utils（editor 包需要）
export { STORE_KEYS, VISUAL_CONST } from './editor/keys';
export { applyPatchesToNodes, createEventBus, createStore } from './editor/runtime';

// -----------------------------------------------------------------------------
// Engine（高性能“状态与渲染分离”基础设施：vanilla store + subscribe）
// -----------------------------------------------------------------------------
export * from './engine';

// -----------------------------------------------------------------------------
// UI Kit（默认皮肤/组件/HUD 插件）
// -----------------------------------------------------------------------------
// 既支持从主入口拿：import { InfiniteMapThemeProvider } from '@qiuyulc/infinite-map'
// 也支持子路径更清晰：import { InfiniteMapThemeProvider } from '@qiuyulc/infinite-map/ui'
export * from './ui';

// themeVersion（hud overlays 会复用）
export { ThemeVersionContext, useThemeVersion } from './hooks/useThemeVersion';

// -----------------------------------------------------------------------------
// Demo（仅建议用于 playground/文档示例，不建议业务依赖）
// -----------------------------------------------------------------------------
// 同样支持主入口与子路径两种用法：
// - import { makeDemoNodes } from '@qiuyulc/infinite-map'
// - import { makeDemoNodes } from '@qiuyulc/infinite-map/demo'
export * from './demo';
