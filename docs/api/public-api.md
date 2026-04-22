# 公开导出总览（阶段 1）

本页用于回答：作为使用者，我可以从包里 import 到什么？

以 `packages/infinite-map/src/index.ts` 为准（建议你在写文档时把该文件当作“对外契约”）。

## 主要导出（按用途）

### React 组件

- `InfiniteMap`
- `InfiniteMapThemeProvider`
- `DefaultNode`
- `Minimap`
- `Slider`

### Editor

- `createDefaultEditorPlugins`
- `EditorPlugins`（导出所有插件工厂函数）

### 工具/布局

- `computeLayout`
- `makeDemoNodes`

### 类型

- `NodeData`

> 后续阶段：建议把“公开类型”和“内部类型”分层，否则使用者很容易 import 到不该依赖的内部结构。

