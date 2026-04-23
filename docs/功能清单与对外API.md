# Infinite Map — 功能清单与对外 API（完整版）

> 统计基于当前仓库 `packages/infinite-map` 对外导出（`src/index.ts`）以及默认编辑器插件集合（`createDefaultEditorPlugins`）的实现现状。

---

## 1. 我们现在做了哪些功能（面向使用者的“能力”）

### 1.1 画布/视口（基础能力）
- 无限画布（世界坐标系）+ 相机模型：`Camera = { x, y, zoom }`
- 平移（Pan）
  - 鼠标/触控板拖拽平移（`Space` 平移模式由 `keyboard-state` 插件维护状态；具体 pan 在组件内部实现）
- 缩放（Zoom）
  - 滚轮缩放、触控板 pinch 缩放（`zoomSpeed` / `pinchZoomFactor` 可调）
  - min/max zoom 限制
- 背景渲染：
  - 点阵背景（`backgroundMode='dots'`）
  - 网格背景（`backgroundMode='grid'`）
  - 自适应网格步进（`dotSpacing/gridSpacing='auto'` 与 `computeAdaptiveSteps` 体系）
- 鼠标附近高亮层（Canvas overlay，高性能）

### 1.2 节点渲染与性能
- DOM 节点渲染（每个节点绝对定位在 world layer）
- 可选虚拟化（空间索引）：
  - 视口内节点筛选 + overscan
  - `keepAlive` 支持（对“重组件”避免频繁卸载/重建）
- **隐藏节点（hidden）不渲染**，并且隐藏会“向下传递”（祖先 hidden => 后代视为 hidden）

### 1.3 编辑器（插件系统）能力（默认编辑器已集成）

#### 选择/框选
- 单选/多选（Shift toggle）
- 点击空白清空选择
- 框选（marquee）：
  - 可配置 `requireShift`
  - 命中 resize/rotate handle 时不会触发框选

#### 拖拽/缩放/旋转
- 拖拽移动（支持多选整体移动）
- 8 点缩放（单选）
- 2D 旋转（选中后使用旋转 handle）
- 3D 旋转（Alt/Option + 拖拽：`rotationX/rotationY`）
- 过程中支持 snapping（对齐线/网格吸附）+ 辅助线 overlay

#### 对齐吸附（snapping）
- 对齐线吸附（与可视范围内节点对齐）
- 网格吸附（grid）
- 吸附引导线（SnapGuidesOverlay）

#### 历史（Undo/Redo）
- `history.undo` / `history.redo`
- move 阶段合并（drag/resize/rotate 等在 `phase=move/end` 下会合并成一次历史记录）
- undo/redo 时会取消正在进行的交互（避免状态“拉扯”）

#### 剪贴板
- Copy / Cut / Paste / Duplicate / Delete
- paste/duplicate 支持 group 结构：复制时 remap `id` 并修正 `parentId`

#### 编组（Group）
- group 节点是一个 `NodeData`（`kind='group'`），成员通过 `parentId` 形成树结构
- `edit.group` / `edit.ungroup`
- **组移动**：拖拽 group 会带动所有后代
- **组缩放**：缩放 group 会按内容区缩放后代（padding 保持恒定）
- **组旋转**：旋转时只旋转后代（group 外框由 group-sync 自动跟随成员 bbox）
- group bbox 自动同步（监听 `patches:applied`）

#### 锁定/隐藏（Lock/Hide）
- `locked?: boolean`
  - **锁定不可选、不可框选、不可拖拽/缩放/旋转**
  - **锁定传递**：祖先 locked => 后代“有效锁定”
- `hidden?: boolean`
  - **隐藏不渲染/不命中/不参与选择与编辑**
  - **隐藏传递**：祖先 hidden => 后代“有效隐藏”
- `edit.lock` / `edit.unlock` / `edit.hide` / `edit.showAll`
  - `showAll` 用于恢复 hidden 节点（因为 hidden 节点不可命中）

#### HUD（可选启用的 UI）
- ZoomDock（默认启用）：右下角缩放滑杆
- Toolbar（默认关闭）：顶部工具条
- ContextMenu（默认关闭）：右键菜单
- Rulers（默认启用）：标尺
- Minimap（默认启用）：小地图

#### View / Z-Index 命令
- 视图命令：
  - `view.zoomIn` / `view.zoomOut` / `view.resetZoom`
  - `view.fitView` / `view.centerView`
  - `view.fitSelection` / `view.centerSelection`
- 层级（zIndex）命令：
  - `z.bringToFront` / `z.bringForward` / `z.sendBackward` / `z.sendToBack` / `z.normalize`

---

## 2. 对外暴露了哪些 API（完整版）

### 2.1 包入口导出（`@qiuyulc/infinite-map`）
来自 `packages/infinite-map/src/index.ts`：

#### React 组件
- `InfiniteMap`
  - `InfiniteMapProps`
  - `InfiniteMapApi`（通过 `apiRef` 暴露）

#### Theme API
> 已移动到 UI 子入口：`@qiuyulc/infinite-map/ui`

#### Core 类型/工具
- `type Camera`
- `type NodeData`
- `type Rect`
- `rectIntersects(a, b)`

#### Layout（预置布局）
- `computeLayout(preset, options)`
- `type LayoutPreset`
- `type LayoutOptions`

#### Demo 数据
> 已移动到 demo 子入口：`@qiuyulc/infinite-map/demo`

#### Editor（可选使用）
- `createDefaultEditorPlugins(opts?)`
- `type DefaultEditorOptions`
- `composePlugins(plugins)`
- `type InfiniteMapPlugin`
- `type MapContext`
- `type NodePatch`
- `type ChangeMeta`
- `EditorPlugins`（命名空间导出所有内置插件工厂）

---

### 2.1.1 UI 子入口导出（`@qiuyulc/infinite-map/ui`）
- UI 组件：`Minimap` / `BackgroundDots` / `BackgroundGrid` / `DefaultNode` / `InfiniteMapThemeProvider`
- Theme：`InfiniteMapTheme` / `lightTheme` / `darkTheme` / `mergeTheme` / `themeToCSSVars`
- HUD plugins：`createToolbarPlugin` / `createDefaultContextMenuPlugin` / `createMinimapPlugin` / `createRulersPlugin` / `createZoomDockPlugin`

### 2.1.2 demo 子入口导出（`@qiuyulc/infinite-map/demo`）
- `makeDemoNodes()`

### 2.2 `InfiniteMapProps`（组件属性，完整版）
核心字段（节选结构与含义，字段名以源码为准）：

#### 数据与渲染
- `nodes: NodeData[]`
- `renderNode?: (node) => ReactNode`（完全自定义节点）
- `renderNodeContent?: (node) => ReactNode`（推荐：沿用 DefaultNode 外观，仅自定义内容区）
- `getDefaultNodeProps?: (node) => { className?: string; style?: CSSProperties }`
- `defaultNodeShowMeta?: boolean`

#### 编辑与插件系统
- `plugins?: InfiniteMapPlugin[]`（不传=纯预览）
- `onNodesChange?: (nextNodes, meta) => void`（高层回调）
- `onPatches?: (patches, meta) => void`（底层 patch 回调，适合协作/历史/性能）
- `commandConflictPolicy?: 'keep-first' | 'override' | 'error'`
- `warnOnCommandConflict?: boolean`
- `editorHooks?: { onBeforeCommand/onAfterCommand/onBeforeApplyPatches/onAfterApplyPatches }`
- `apiRef?: MutableRefObject<InfiniteMapApi | null>`（对外暴露 API）

#### 相机与交互
- `initialCamera?: Camera`
- `onNodeDrag?: (id, pos, phase) => void`（DOM 模式下的节点拖动回调）

#### 背景/缩放
- `backgroundMode?: 'dots' | 'grid'`
- `dotSpacing?: number | 'auto'`
- `dotRadiusPx?: number`
- `dotAlpha?: number`
- `gridSpacing?: number | 'auto'`
- `gridAlpha?: number`
- `highlightRadiusPx?: number`
- `wheelPulseStrength?: number`
- `minZoom?` / `maxZoom?` / `zoomSpeed?` / `pinchZoomFactor?`

#### 虚拟化
- `virtualization?: { enabled?: boolean; overscanPx?: number; keepAlive?: (node) => boolean }`
- `overscanPx?: number`（兼容旧字段）
- `cellSize?: number`（空间索引网格大小）

#### Minimap
- `minimapWidth?` / `minimapHeight?` / `minimapCachePadding?`
- `minimapNeedsRedraw?: unknown`（外部触发重新渲染的信号）

#### 主题
- `themeBase?: 'light' | 'dark'`
- `theme?: Partial<InfiniteMapTheme>`

---

### 2.3 `InfiniteMapApi`（通过 `apiRef` 暴露的方法，完整版）
> 仅当 `plugins` 存在且相关能力被加载时有效（例如 history/selection/commands/camera 等）。

- `undo(): void`
- `redo(): void`
- `canUndo(): boolean`
- `canRedo(): boolean`
- `subscribeHistory(listener): () => void`
- `runCommand(id, payload?): boolean`
- `getCommands(): Command[]`
- `getCommand(id): Command | undefined`
- `getSelectionIds(): string[]`
- `subscribeSelection(listener): () => void`
- `getCamera(): Camera`
- `setCamera(next, opts?): void`
- `subscribeCamera(listener): () => void`
- `getNodes(): NodeData[]`

---

### 2.4 Editor 插件系统（给二次开发的公共类型）
来自 `packages/infinite-map/src/editor/types.ts`（已对外导出）：

#### `NodePatch`
- `move` / `set` / `add` / `remove`

#### `ChangeMeta`
- `source: 'plugin'`
- `plugin: string`
- `reason`: `'drag' | 'click-select' | 'marquee-select' | ... | 'group' | 'ungroup' | 'group-sync' | 'undo' | 'redo'`
- `phase?: 'start' | 'move' | 'end'`
- `ids?: string[]`

#### `MapContext`（插件运行时上下文）
- 只读数据：`getCamera/getViewport/getNodes/getVisibleNodes`
- 坐标变换：`screenToWorld/worldToScreen/rectScreenToWorld/rectWorldToScreen`
- 查询：`queryNodesInWorldRect`
- 数据变更出口：`applyPatches(patches, meta)`
- 总线与共享状态：`bus` / `store`
- 服务容器：`registerService/getService`
- 可选命令执行：`runCommand?`
- `requestRender()`

#### `InfiniteMapPlugin`
- `id/enabled/provides/requires/order`
- `setup/teardown`
- `handlers`（指针/键盘/滚轮/右键）
- `overlay`（React 组件）
- `slot: 'background' | 'overlay' | 'hud'`
- `overlayPointerEvents: 'none' | 'auto'`
- `commands?: Record<string, Command>`

---

### 2.5 内置插件工厂（`EditorPlugins.*`，完整版）
从 `EditorPlugins` 命名空间导出：

#### core
- `createKeyboardStatePlugin`
- `createCoreServicesPlugin`
- `createCommandRunnerPlugin`
- `createShortcutsPlugin`
- `createHistoryPlugin`
- `createViewCommandsPlugin`
- `createZIndexPlugin`
- `createGroupPlugin`
- `createLockHidePlugin`

#### selection
- `createSelectionPlugin`
- `createMarqueeSelectPlugin`

#### transform
- `createDragPlugin`
- `createResizePlugin`
- `createRotatePlugin`
- `createRotate3DPlugin`

#### snapping
- `createSnapGuidesPlugin`

#### clipboard
- `createClipboardPlugin`

#### hud
- `createContextMenuPlugin`
> HUD UI 插件已移至：`@qiuyulc/infinite-map/ui`

---

## 3. 默认编辑器（`createDefaultEditorPlugins`）包含哪些插件
默认顺序（简化描述）：
1. keyboard-state
2. core-services
3. command-runner
4. shortcuts
5. history
6. view commands
7. z-index
8. snap guides
9. rotate3d（Alt + 拖）
10. group
11. lock/hide
12. selection
13. clipboard（可关）
14. rotate
15. resize
16. drag
17. zoomDock（默认开）
18. contextMenu（默认关）
19. rulers（默认开）
20. minimap（默认开）
21. marquee（默认开）

---

## 4. 默认命令列表（commandId）

### 4.1 history
- `history.undo`（默认快捷键：`Mod+Z`）
- `history.redo`（默认快捷键：`Shift+Mod+Z`）

### 4.2 edit（clipboard）
- `edit.copy`（`Mod+C`）
- `edit.paste`（`Mod+V`）
- `edit.cut`（`Mod+X`）
- `edit.duplicate`（`Mod+D`）
- `edit.delete`（`Delete` / `Backspace`）

### 4.3 view
- `view.zoomIn`（插件声明 shortcut：`Mod+=`）
- `view.zoomOut`（插件声明 shortcut：`Mod+-`）
- `view.resetZoom`
- `view.fitView`
- `view.centerView`
- `view.fitSelection`
- `view.centerSelection`

### 4.4 group
- `edit.group`（`Mod+G`）
- `edit.ungroup`（`Shift+Mod+G`）

### 4.5 lock/hide
- `edit.lock`
- `edit.unlock`
- `edit.hide`
- `edit.showAll`

### 4.6 z-index
- `z.bringToFront`
- `z.bringForward`
- `z.sendBackward`
- `z.sendToBack`
- `z.normalize`

---

## 5. NodeData（节点数据结构）现状摘要
来自 `packages/infinite-map/src/core/types.ts`（已对外导出）：

### 几何/层级
- `id, x, y, width, height`
- `z?: number`
- `rotation?: number`
- `rotationX?: number`
- `rotationY?: number`

### 显示/业务
- `label?: string`
- `color?: string`
- `data?: unknown`（建议不要放超大对象）
- `resourceId?: string`（建议用于外置大数据引用）

### 编辑器结构字段
- `kind?: 'node' | 'group'`
- `parentId?: string`
- `locked?: boolean`（锁定传递）
- `hidden?: boolean`（隐藏传递）
