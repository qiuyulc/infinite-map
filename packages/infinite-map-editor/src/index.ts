/**
 * @qiuyulc/infinite-map-editor
 *
 * 提供基于 @qiuyulc/infinite-map 的编辑器能力（插件集合 + 默认编辑器插件组装）。
 */

export { composePlugins } from './editor/composePlugins';
export { createDefaultEditorPlugins } from './editor/createDefaultEditorPlugins';
export type { DefaultEditorOptions } from './editor/createDefaultEditorPlugins';

// editor utils（供插件/上层使用）
export * from './editor/groupUtils';
export * from './editor/snapUtils';

// 插件集合（按需引用）
export * as EditorPlugins from './editor/plugins';

// 便于用户只引一个包：把核心类型从 core 包再导出一份
export type { InfiniteMapPlugin, MapContext, NodePatch, ChangeMeta } from '@qiuyulc/infinite-map';

