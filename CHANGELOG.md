# Changelog

本项目遵循语义化版本（SemVer）。对外持久化格式（Doc schema）使用 `schemaVersion` 独立演进，见下文“Doc schema”。

## Unreleased

- （预留）

## 0.1.0

初始版本（monorepo）：

- `@qiuyulc/infinite-map`
  - Scheme C 输入管线：`hitTest → pointerDownProcessors → gestures`，并内置 `pan` gesture
  - hover：写入 `STORE_KEYS.hoverHit` + `hover:change` 事件
  - Doc 持久化：`exportDoc/importDoc`（含 legacy v0/v1 → v2 迁移）
  - 宿主友好 API：`api.subscribe(...)`、`get/setSelectionIds`、`getNodeRect/getSelectionRect`
  - 错误边界与诊断：结构化 `onEditorError` + overlay ErrorBoundary + `debug:*` 指标

- `@qiuyulc/infinite-map-editor`
  - 默认编辑器插件与 UI：selection/drag/resize/rotate/marquee/history/minimap/toolbar/…
  - `composePlugins()`：requires/provides 自动排序 + plugin.priority + 多 provider 检测

## Doc schema

- `schemaVersion` 与 npm 包版本解耦：
  - npm minor/patch 允许做向后兼容的 schema 修复（通过 migrations）
  - schema 的 breaking change 才会递增 `schemaVersion`

