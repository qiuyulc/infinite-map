# Changelog

## 0.0.6

### Patch Changes

- d2ce94c: 相机坐标系从视口左上角改为视口中心原点，解决编辑/预览切换时节点偏移问题。

  破坏性变更:

  - Camera.x/y 语义变更: 从视口左上角世界坐标 → 视口中心世界坐标
  - DOC_SCHEMA_VERSION 1 → 2，旧文档无法加载
  - initialCamera 默认值变更
  - cameraToTransform 签名增加 viewport 参数
  - useCoordinateTransforms / useWheelControls 需要透传 viewportRef

## 0.0.5

### Patch Changes

- d01e03e: - 修复 scheduleComputeVisible 渲染路径未过滤 hidden 节点导致隐藏后仍渲染的问题

## 0.0.4

### Patch Changes

- 0006844: - 选择交互：单击子节点自动提升到最外层 group，双击穿透选中子节点自身，Shift+单击提升后 toggle
  - 编组提升：编组时自动将子节点提升到容器 group，支持嵌套 group 父子覆盖检查与外层提升
  - 编组文档：补充 group 插件完整文档（选择交互、编组规则、service API、groupUtils 工具函数）
  - 单元测试：新增 hitNormalize、groupPlugin、selectionPlugin 测试共 19 个用例

## 0.0.4-beta.0

### Patch Changes

- Update InfiniteMap component and hook API attachment logic.

## 0.0.3

### Patch Changes

- 1cd74b2: 修复 bug

## 0.0.2

### Patch Changes

- ddff230: 添加各包的 README.md 文档，包含安装说明、API 概览、快速上手示例与子路径导出说明。

## Unreleased
