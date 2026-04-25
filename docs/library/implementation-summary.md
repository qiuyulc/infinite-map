# 实现总览：Infinite Map（map）目前已实现哪些功能

这页用于“复盘/总结实现”，按 **功能 → 实现位置/机制** 归类，便于你写总结或对外说明。

> 统计范围：本仓库 `packages/infinite-map`（核心渲染 + plugin contract）与 `packages/infinite-map-editor`（默认编辑器插件与 HUD）。

---

## 0）核心架构（你可以这样一句话描述）

`InfiniteMap` 是运行时（runtime）：负责渲染、相机、输入管线与统一扩展点；编辑器能力由插件提供，所有变更通过 `patches` 进入 history/持久化/协作扩展。

典型数据流：

1. **输入**：`hitTest → pointerDownProcessors → gestures`
2. **变更**：插件计算 `NodePatch[]` → `document.applyPatches(...)`
3. **观测**：触发 `patches:applied`（history 等订阅）→ 更新 nodes → 重渲染

关键文件：
- Runtime / 输入管线：`packages/infinite-map/src/components/InfiniteMap.tsx`
- Plugin 装配：`packages/infinite-map-editor/src/editor/composePlugins.ts`
- Patch 应用：`packages/infinite-map/src/editor/runtime.ts`（`applyPatchesToNodes`）

---

## 1）画布与相机（Camera / Viewport）

### 1.1 世界坐标系（world ↔ screen）
- 能力：屏幕坐标与世界坐标互转、矩形互转、viewport 获取
- 实现：
  - `packages/infinite-map/src/components/InfiniteMap.tsx`（`screenToWorld/worldToScreen/rect...` 等）
  - `packages/infinite-map/src/core/types.ts`

### 1.2 平移（Pan）
- 能力：鼠标/指针拖动空白区域平移；`Space` 平移模式
- 实现：
  - `Space` 状态：`packages/infinite-map-editor/src/plugins/createKeyboardStatePlugin.ts`（写 `STORE_KEYS.keyboardSpace`）
  - pan 行为：在 `InfiniteMap.tsx` 内部对 blank hit 的指针流程处理

### 1.3 缩放（Zoom / Wheel / Pinch）
- 能力：滚轮缩放、触控板 pinch、min/max zoom、zoomSpeed 等
- 实现：
  - `packages/infinite-map/src/hooks/useWheelControls.ts`
  - `packages/infinite-map/src/components/InfiniteMap.tsx`

---

## 2）渲染层（Nodes / Background / Overlay）

### 2.1 节点 DOM 渲染
- 能力：节点绝对定位在 world layer；支持自定义 render
- 实现：`packages/infinite-map/src/components/InfiniteMap.tsx`、`packages/infinite-map/src/components/DefaultNode.tsx`

### 2.2 背景（Dots/Grid + 自适应步进）
- 能力：点阵/网格背景；`dotSpacing/gridSpacing='auto'` 自适应步进
- 实现：
  - `packages/infinite-map/src/components/BackgroundDots.tsx`
  - `packages/infinite-map/src/components/BackgroundGrid.tsx`
  - `packages/infinite-map/src/core/steps.ts`

### 2.3 高亮层（Canvas overlay）
- 能力：鼠标附近高亮/辅助渲染（性能友好）
- 实现：
  - `packages/infinite-map/src/hooks/useHighlightLayer.ts`
  - `packages/infinite-map/src/components/InfiniteMap.tsx`

### 2.4 主题（Theme + CSS Vars）
- 能力：light/dark theme、merge、导出 CSS variables
- 实现：`packages/infinite-map/src/theme.ts`、`packages/infinite-map/src/components/InfiniteMapThemeProvider.tsx`

---

## 3）性能：虚拟化与 keepAlive

### 3.1 空间索引 + 视口裁剪（virtualization）
- 能力：只渲染视口范围内节点 + overscan
- 实现：
  - `packages/infinite-map/src/core/spatialIndex.ts`
  - `packages/infinite-map/src/hooks/useVisibleNodes.ts`

### 3.2 hidden 向下传递（祖先 hidden → 后代不可见）
- 能力：hidden 不渲染；并向下传递
- 实现：`useVisibleNodes` + editor 的 `isHiddenEffective`（`packages/infinite-map-editor/src/editor/groupUtils.ts`）

### 3.3 keepAlive（重组件保活）
- 能力：节点离开视口也可保持渲染实例（避免频繁卸载/重建）
- 实现：`packages/infinite-map/src/hooks/useVisibleNodes.ts`（keepAliveIdSet）

---

## 4）插件系统（Plugin Contract）与输入管线（Scheme C）

### 4.1 插件装配（requires/provides + 排序）
- 能力：插件声明依赖，自动排序；检测多 provider；支持 priority
- 实现：`packages/infinite-map-editor/src/editor/composePlugins.ts`

### 4.2 输入管线（Scheme C）
- 能力：`hitTests → pointerDownProcessors → gestures`（并维护 hover hit）
- 实现：`packages/infinite-map/src/components/InfiniteMap.tsx`

### 4.3 命令系统（commands）
- 能力：plugins 注册 commands；runtime 合并 registry；支持冲突策略；统一触发
- 实现：
  - registry：`packages/infinite-map/src/components/InfiniteMap.tsx`
  - runner：`packages/infinite-map-editor/src/plugins/createCommandRunnerPlugin.ts`
  - 快捷键：`packages/infinite-map-editor/src/plugins/createShortcutsPlugin.ts`

### 4.4 错误边界与诊断
- 能力：结构化 `onEditorError(err, info)`；overlay error boundary；debug 指标写入 store（`debug:*`）
- 实现：
  - 类型：`packages/infinite-map/src/editor/types.ts`（`EditorErrorInfo/Kind`）
  - runtime：`packages/infinite-map/src/components/InfiniteMap.tsx`

---

## 5）持久化：Doc schema（export/import + migrations）

- 能力：`exportDoc/importDoc`；legacy v0/v1 → v2 迁移；支持 `resources/meta`
- 实现：`packages/infinite-map/src/editor/document.ts`
- 说明文档：`docs/library/doc-schema.md`

---

## 6）默认编辑器能力（infinite-map-editor）

> 默认集合入口：`packages/infinite-map-editor/src/editor/createDefaultEditorPlugins.ts`

### 6.1 Selection / HitTest / Hover
- 单选/多选/空白清空、group 命中规范化、locked 可选中但阻断 gesture、hidden 不命中
- 实现：`packages/infinite-map-editor/src/plugins/createSelectionPlugin.tsx`

### 6.2 Drag（多选整体移动）
- 实现：`packages/infinite-map-editor/src/plugins/createDragPlugin.ts`

### 6.3 Resize（单选 8 点缩放）
- 实现：`packages/infinite-map-editor/src/plugins/createResizePlugin.ts`

### 6.4 Rotate（2D）与 Rotate3D（Alt）
- 实现：
  - `packages/infinite-map-editor/src/plugins/createRotatePlugin.ts`
  - `packages/infinite-map-editor/src/plugins/createRotate3DPlugin.ts`

### 6.5 Snap（对齐/网格吸附）+ Guides Overlay
- 实现：
  - `packages/infinite-map-editor/src/plugins/createSnapGuidesPlugin.ts`
  - `packages/infinite-map-editor/src/editor/snapUtils.ts`
  - `packages/infinite-map-editor/src/plugins/SnapGuidesOverlay.tsx`

### 6.6 History（Undo/Redo）
- move 阶段合并（phase=move/end）、add/remove/set 回滚、undo/redo 时取消进行中的交互状态
- 实现：`packages/infinite-map-editor/src/plugins/createHistoryPlugin.ts`

### 6.7 Clipboard（copy/cut/paste/duplicate/delete）
- group 结构保持：remap id + 修正 parentId
- 实现：`packages/infinite-map-editor/src/plugins/createClipboardPlugin.ts`

### 6.8 Group（group/ungroup + group-sync）
- group 节点：`kind='group'`；成员通过 `parentId` 组织成树
- expandIds：拖拽/删除/复制时展开后代
- group bbox 自动同步（group-sync 监听 `patches:applied`）
- 实现：
  - `packages/infinite-map-editor/src/plugins/createGroupPlugin.ts`
  - `packages/infinite-map-editor/src/editor/groupUtils.ts`

### 6.9 Lock/Hide
- `edit.lock / edit.unlock / edit.hide / edit.showAll`
- 实现：`packages/infinite-map-editor/src/plugins/createLockHidePlugin.ts`

### 6.10 Align / Distribute
- 对齐/分布命令（基于 selection bbox；跳过 locked）
- 实现：`packages/infinite-map-editor/src/plugins/createAlignDistributePlugin.ts`

### 6.11 键盘移动（Arrow nudge）
- 方向键移动，Shift 大步；跳过 locked
- 实现：`packages/infinite-map-editor/src/plugins/createNudgePlugin.ts`

### 6.12 View Commands
- zoomIn/out/reset、fit/center view、fit/center selection
- 实现：`packages/infinite-map-editor/src/plugins/createViewCommandsPlugin.ts`

### 6.13 Z-Index Commands
- 置顶/上移/下移/置底/normalize
- 实现：`packages/infinite-map-editor/src/plugins/createZIndexPlugin.ts`

### 6.14 HUD/UI（可选启用）
- minimap/rulers/zoomDock/toolbar/contextmenu
- 实现：`packages/infinite-map-editor/src/plugins/*Plugin.ts(x)`

### 6.15 导出 PNG（骨架）
- `file.exportPng` 命令触发 `export:png` 事件（宿主自行实现截图）
- 实现：
  - `packages/infinite-map-editor/src/plugins/createExportPngPlugin.ts`
  - `packages/infinite-map/src/editor/types.ts`（EventMap）

---

## 7）回归测试覆盖（关键点）

测试集中在：
- `packages/infinite-map/src/__tests__/...`
- `packages/infinite-map-editor/src/__tests__/...`

其中 editor 的回归重点覆盖：
- history 合并/边界、group/clipboard 结构、输入命中语义（locked/hidden/hover）等。

