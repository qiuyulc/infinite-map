---
"@qiuyulc/infinite-map": patch
"@qiuyulc/infinite-map-editor": patch
---

- 新增 `origin` prop：支持 `'center'`（默认）和 `'top-left'` 原点模式，resize 自动跟随
- 新增 `onReady` 生命周期钩子，viewport 就绪后触发
- 新增 `getContainerTopLeft()` / `moveOriginToTopLeft()` API 方法
- 新增 `cameraForTopLeftOrigin` 工具函数
- 重构：提取 `useSyncedRef`、`useViewportReady`、`usePanKeepAlive` hooks
- 更新文档和海报模式示例
