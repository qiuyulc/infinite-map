/**
 * @qiuyulc/infinite-map-editor
 *
 * 提供基于 @qiuyulc/infinite-map 的编辑器能力（插件集合 + 默认编辑器插件组装）。
 */

export { composePlugins } from './editor/composePlugins';
export { createDefaultEditorPlugins } from './editor/createDefaultEditorPlugins';
export type { DefaultEditorOptions } from './editor/createDefaultEditorPlugins';

// 默认编辑器（带 UI / HUD）
export { createDefaultEditorPluginsWithUI } from './createDefaultEditorPluginsWithUI';
export type { DefaultEditorWithUIOptions } from './createDefaultEditorPluginsWithUI';

// UI：直接从编辑器包根入口导出（避免 `@qiuyulc/infinite-map-editor/ui`）
// 注意：旧的 BackgroundDots/Grid（React 相机驱动背景）已移除，仅保留通用组件/主题。
export { DefaultNode, InfiniteMapThemeProvider } from '@qiuyulc/infinite-map';
export type { InfiniteMapTheme } from '@qiuyulc/infinite-map';
export { lightTheme, darkTheme, mergeTheme, themeToCSSVars, themeOverrideToCSSVars } from '@qiuyulc/infinite-map';

// HUD plugins
export { createToolbarPlugin } from './plugins/createToolbarPlugin';
export { createDefaultContextMenuPlugin } from './plugins/createDefaultContextMenuPlugin';
export { createMinimapPlugin } from './plugins/createMinimapPlugin';
export { createRulersPlugin } from './plugins/createRulersPlugin';
export { createZoomDockPlugin } from './plugins/createZoomDockPlugin';

// 常用 Options/类型（便于使用者配置默认组装）
export type { SnapConfig, SnapGuidesPluginOptions } from './plugins/createSnapGuidesPlugin';
export type { ViewCommandsPluginOptions } from './plugins/createViewCommandsPlugin';
export type { HistoryPluginOptions } from './plugins/createHistoryPlugin';
export type { ShortcutsPluginOptions } from './plugins/createShortcutsPlugin';
export type { KeyboardStatePluginOptions } from './plugins/createKeyboardStatePlugin';
export type { DragPluginOptions } from './plugins/createDragPlugin';
export type { ResizePluginOptions } from './plugins/createResizePlugin';
export type { SelectionPluginOptions } from './plugins/createSelectionPlugin';
export type { MarqueeSelectPluginOptions } from './plugins/createMarqueeSelectPlugin';
export type { ClipboardPluginOptions } from './plugins/createClipboardPlugin';
export type { ToolbarItem, ToolbarPluginOptions } from './plugins/createToolbarPlugin';
export type { ContextMenuPayload, ContextMenuPluginOptions } from './plugins/createContextMenuPlugin';
export type { ContextMenuItem, DefaultContextMenuOptions } from './plugins/createDefaultContextMenuPlugin';
export type { MinimapPluginOptions } from './plugins/createMinimapPlugin';
export type { RulersPluginOptions } from './plugins/createRulersPlugin';
export type { ZoomDockPluginOptions } from './plugins/createZoomDockPlugin';

// editor utils（供插件/上层使用）
export * from './editor/groupUtils';
export * from './editor/snapUtils';

// 插件集合（按需引用）
export * as EditorPlugins from './plugins';

// 便于用户只引一个包：把核心类型从 core 包再导出一份
export type { InfiniteMapPlugin, MapContext, NodePatch, ChangeMeta } from '@qiuyulc/infinite-map';
