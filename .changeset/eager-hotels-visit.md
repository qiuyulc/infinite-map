---
"@qiuyulc/infinite-map": patch
"@qiuyulc/infinite-map-editor": patch
---

- 新增 onCameraChange / onViewportResize / onDestroy 生命周期钩子
- apiRef 不再强制依赖 plugins，无插件也可用相机/节点等方法
- 修复 origin 模式下 cameraRef 未同步导致 getCamera 返回旧值
- 重构：useOriginSync + useLifecycleCallbacks 替代 useViewportReady
- 新增 lifecycleCallbacks 测试 7 个用例
