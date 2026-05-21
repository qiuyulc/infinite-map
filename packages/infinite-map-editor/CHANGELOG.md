# Changelog

## 0.0.7

### Patch Changes

- - 新增 `origin` prop：支持 'center'（默认）和 'top-left' 原点模式，resize 自动跟随
  - 新增 `onReady` 生命周期钩子，viewport 就绪后触发
  - 新增 `getContainerTopLeft()` / `moveOriginToTopLeft()` API 方法
  - 新增 `cameraForTopLeftOrigin` 工具函数
  - 重构：提取 `useSyncedRef`、`useViewportReady`、`usePanKeepAlive` hooks
- Updated dependencies
  - @qiuyulc/infinite-map@0.0.7

## 0.0.6

### Patch Changes

- d2ce94c: 相机坐标系从视口左上角改为视口中心原点，解决编辑/预览切换时节点偏移问题。

  破坏性变更:

  - Camera.x/y 语义变更: 从视口左上角世界坐标 → 视口中心世界坐标
  - DOC_SCHEMA_VERSION 1 → 2，旧文档无法加载
  - initialCamera 默认值变更
  - cameraToTransform 签名增加 viewport 参数
  - useCoordinateTransforms / useWheelControls 需要透传 viewportRef

- Updated dependencies [d2ce94c]
  - @qiuyulc/infinite-map@0.0.6

## 0.0.5

### Patch Changes

- Updated dependencies [d01e03e]
  - @qiuyulc/infinite-map@0.0.5

## 0.0.4

### Patch Changes

- 0006844: - 选择交互：单击子节点自动提升到最外层 group，双击穿透选中子节点自身，Shift+单击提升后 toggle
  - 编组提升：编组时自动将子节点提升到容器 group，支持嵌套 group 父子覆盖检查与外层提升
  - 编组文档：补充 group 插件完整文档（选择交互、编组规则、service API、groupUtils 工具函数）
  - 单元测试：新增 hitNormalize、groupPlugin、selectionPlugin 测试共 19 个用例
- Updated dependencies [0006844]
  - @qiuyulc/infinite-map@0.0.4

## 0.0.4-beta.0

### Patch Changes

- Updated dependencies
  - @qiuyulc/infinite-map@0.0.4-beta.0

## 0.0.3

### Patch Changes

- 1cd74b2: 修复 bug
- Updated dependencies [1cd74b2]
  - @qiuyulc/infinite-map@0.0.3

## 0.0.2

### Patch Changes

- ddff230: 添加各包的 README.md 文档，包含安装说明、API 概览、快速上手示例与子路径导出说明。
- Updated dependencies [ddff230]
  - @qiuyulc/infinite-map@0.0.2

## Unreleased
