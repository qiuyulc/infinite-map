# Infinite Map — 功能清单与对外 API（完整版）

> 统计基于当前仓库：
> - `packages/infinite-map`（渲染层 + plugin contract）
> - `packages/infinite-map-editor`（编辑器插件集合 + HUD/UI）
> 的对外导出与实现现状。

> 补充阅读：
> - [NodeData 字段参考](/infinite-map/library/node-data)
> - [组件 API](/infinite-map/library/component-api)
> - [InfiniteMapApi 参考](/infinite-map/library/api-ref)
> - [插件配置](/infinite-map/library/plugin-config)
> - [主题定制](/infinite-map/library/theming)

---

## 1. 我们现在做了哪些功能（面向使用者的"能力"）

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
  - 无背景（`backgroundMode='none'`）
  - 自适应网格步进（`dotSpacing/gridSpacing='auto'` 与 `computeAdaptiveSteps` 体系）
- 鼠标附近高亮层（Canvas overlay，高性能，通过 `highlightRadiusPx` 控制）

### 1.2 节点渲染与性能
- DOM 节点渲染（每个节点绝对定位在 world layer）
- 可选虚拟化（空间索引）：
  - 视口内节点筛选 + overscan
  - `keepAlive` 支持（对"重组件"避免频繁卸载/重建）
  - `panKeepAlive`（pan 期间保持离场节点）
- **隐藏节点（hidden）不渲染**，并且隐藏会"向下传递"（祖先 hidden => 后代视为 hidden）

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

#### 键盘微调（Nudge）
- 方向键微调选中节点：`↑ ↓ ← →`（默认 1px）
- 大步微调：`Shift + ↑ ↓ ← →`（默认 10px）

#### 对齐吸附（snapping）
- 对齐线吸附（与可视范围内节点对齐）
- 网格吸附（grid）
- 吸附引导线（SnapGuidesOverlay）
- 参考线吸附（从标尺拖出的 guides）

#### 对齐/分布（Align / Distribute）
- 对齐：左/水平居中/右/顶/垂直居中/底
- 分布：水平等间距 / 垂直等间距
- 命令：`edit.alignLeft` ~ `edit.alignBottom`、`edit.distributeH` / `edit.distributeV`
- UI：已挂到右键菜单（对齐需 ≥2 选中，分布需 ≥3 选中）

#### 历史（Undo/Redo）
- `history.undo` / `history.redo`
- move 阶段合并（drag/resize/rotate 等在 `phase=move/end` 下会合并成一次历史记录）
- undo/redo 时会取消正在进行的交互（避免状态"拉扯"）

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
  - **锁定可以被"点击选中"（用于解锁），但不可拖拽/缩放/旋转、不可框选**
  - **锁定传递**：祖先 locked => 后代"有效锁定"
- `hidden?: boolean`
  - **隐藏不渲染/不命中/不参与选择与编辑**
  - **隐藏传递**：祖先 hidden => 后代"有效隐藏"
- `edit.lock` / `edit.unlock` / `edit.hide` / `edit.showAll`
  - `showAll` 用于恢复 hidden 节点（因为 hidden 节点不可命中）

#### 导出 PNG（Export PNG）
- 命令：`file.exportPng`
- 触发 `export:png` 事件（骨架，宿主自行实现截图）

#### HUD（可选启用的 UI）
- ZoomDock（默认启用）：右下角缩放滑杆
- Toolbar（默认关闭）：顶部工具条
- ContextMenu（默认关闭）：右键菜单（右键命中节点时会先把该节点设为选中；若命中组内节点则选中最外层 group）
- Rulers（默认启用）：标尺
- Minimap（默认启用）：小地图

#### 预览/只读模式（重要）
当满足以下任一条件时，编辑器会自动退化为"预览/只读"（不会出现选中框、缩放点、对齐线、右键菜单、工具栏、框选等编辑 UI）：
- `editMode="readonly"` 或 `editable={false}`
- `editMode="auto"`（默认）且 **未提供变更出口**（`onNodesChange/onPatches` 都不传）

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
从主入口与 UI 子入口都可用：
- `InfiniteMapThemeProvider` / `BackgroundDots` / `BackgroundGrid` / `DefaultNode`
- `InfiniteMapTheme` / `lightTheme` / `darkTheme` / `mergeTheme` / `themeToCSSVars` / `themeOverrideToCSSVars`

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
从主入口与 demo 子入口都可用：`makeDemoNodes()`

#### Plugin Contract（供 editor 包/社区插件复用）
- `type InfiniteMapPlugin`
- `type MapContext`
- `type NodePatch`
- `type ChangeMeta`
- `type Command`
- 事件类型：`MapPointerEvent` / `MapWheelEvent` / `MapKeyEvent` / `MapContextMenuEvent`
- store/runtime：`STORE_KEYS` / `VISUAL_CONST` / `createStore` / `createEventBus` / `applyPatchesToNodes`

---

### 2.1.1 UI 子入口导出（`@qiuyulc/infinite-map/ui`）
- UI 组件（渲染层）：`BackgroundDots` / `BackgroundGrid` / `DefaultNode` / `InfiniteMapThemeProvider`
- Theme：`InfiniteMapTheme` / `lightTheme` / `darkTheme` / `mergeTheme` / `themeToCSSVars` / `themeOverrideToCSSVars`

> HUD 插件（minimap / rulers / toolbar / context menu / zoom dock）由 `@qiuyulc/infinite-map-editor` 导出（插件 + overlay 逻辑在 editor 包里）。

### 2.1.2 Editor 包入口导出（`@qiuyulc/infinite-map-editor`）
- `composePlugins(plugins)`
- `createDefaultEditorPlugins(opts?)` / `type DefaultEditorOptions`
- `createDefaultEditorPluginsWithUI(opts?)` / `type DefaultEditorWithUIOptions`
- `EditorPlugins`（命名空间导出内置插件工厂）
- editor utils：`groupUtils` / `snapUtils`
- 便于只安装一个包：再导出 core 合同类型 `InfiniteMapPlugin/MapContext/NodePatch/ChangeMeta`

> 备注：`DefaultEditorOptions` 现在按"插件名分组"提供配置（例如 `snap/view/shortcuts/drag/resize/...`），便于透传到对应插件工厂。

### 2.1.3 Editor UI（仍从包根入口导出）
- HUD plugins：`createToolbarPlugin` / `createDefaultContextMenuPlugin` / `createMinimapPlugin` / `createRulersPlugin` / `createZoomDockPlugin`
- Visual plugins：`createHoverHighlightPlugin`

> 备注：`DefaultEditorWithUIOptions` 同样按插件名分组提供 `toolbar/minimap/rulers/zoomDock/contextMenu/hoverHighlight` 等配置对象，并可通过 `enabled` 字段控制是否挂载对应插件。

### 2.1.4 demo 子入口导出（`@qiuyulc/infinite-map/demo`）
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
- `editMode?: 'auto' | 'readonly' | 'controlled'`
- `editable?: boolean`（语法糖；false=readonly，true=controlled）
- `onNodesChange?: (nextNodes, meta) => void`（高层回调）
- `onPatches?: (patches, meta) => void`（底层 patch 回调，适合协作/历史/性能）
- `commandConflictPolicy?: 'keep-first' | 'override' | 'error'`
- `warnOnCommandConflict?: boolean`
- `editorHooks?: { onBeforeCommand/onAfterCommand/onBeforeApplyPatches/onAfterApplyPatches }`
- `hookMode?: 'observe' | 'intercept'`
  - `observe`（默认）：hooks 只观察/记录，不影响执行流程
  - `intercept`：允许 `onBeforeCommand` 返回 false 阻止执行；允许 `onBeforeApplyPatches` 返回 patches 覆盖
- `onEditorError?: (err, info) => void`
  - 用于收集 hooks/command 执行异常（默认不会 throw 中断编辑器）
- `apiRef?: MutableRefObject<InfiniteMapApi | null>`（对外暴露 API）

#### 相机与交互
- `initialCamera?: Camera`
- `panEnabled?: boolean`（默认 `true`；false 则禁用平移，包括 Space 模式与触控板平移）
- `onNodeDrag?: (id, pos, phase) => void`（节点拖动回调）

#### 背景/缩放
- `backgroundMode?: 'dots' | 'grid' | 'none'`
- `dotSpacing?: number | 'auto'`
- `dotRadiusPx?: number`
- `dotAlpha?: number`
- `gridSpacing?: number | 'auto'`
- `gridAlpha?: number`
- `highlightRadiusPx?: number`
- `wheelPulseStrength?: number`
- `minZoom?` / `maxZoom?` / `zoomSpeed?` / `pinchZoomFactor?`

#### 虚拟化
- `virtualization?: { enabled?: boolean; overscanPx?: number; keepAlive?: (node) => boolean; panKeepAlive?: boolean | { maxNodes?: number } }`
- `overscanPx?: number`（兼容旧字段）
- `cellSize?: number`（空间索引网格大小）

#### 主题 / 调试
- `themeBase?: 'light' | 'dark'`
- `theme?: Partial<InfiniteMapTheme>`
- `debug?: boolean`（默认 `false`，打开后写入 debug:* store 键）

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
- `subscribe(type, handler)`：订阅事件总线（`'camera:changed'`、`'selection:change'`、`'drag:start/move/end'`、`'patches:applied'` 等）
- `getSelectionIds(): string[]`
- `setSelectionIds(ids: string[]): void`
- `subscribeSelection(listener): () => void`
- `getNodeRect(id): Rect | null`（世界坐标包围盒）
- `getSelectionRect(): Rect | null`
- `getCamera(): Camera`
- `setCamera(next, opts?): void`
- `subscribeCamera(listener): () => void`
- `getNodes(): NodeData[]`
- `applyPatches(patches, meta?): void` — 以可追踪的方式修改节点（history 记录逆操作）
- `updateNodeData(idOrData, data?): void` — 修改 data 字段的便利糖
- `serializeDoc(meta?): InfiniteMapDoc`
- `parseDoc(doc, opts?): void`

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
- `id/enabled/provides/requires/order/priority`
- `setup/teardown`
- `input`（wheel/key/contextmenu 等非指针输入）
- `hitTests`（命中贡献者；统一 node/handle 命中）
- `pointerDownProcessors`（hitTest 之后、gesture 之前；用于 selection 等"非互斥逻辑"，可返回 `{stop}` 阻断后续手势，或返回 `{hit}` 覆盖本次有效命中）
- `gestures`（互斥手势：drag/resize/rotate/marquee/pan…；pointer 统一走 hitTest→processors→gestures）
- `inputHooks`（`onBefore/AfterHitTest`、`onHoverChange`、`onBefore/AfterGesture`）
- `overlay`（React 组件）
- `slot: 'background' | 'overlay' | 'hud'`
- `overlayPointerEvents: 'none' | 'auto'`
- `commands?: Record<string, Command>`

补充（Scheme C）：
- hover 命中会写入 `STORE_KEYS.hoverHit`，并注册 `hover` service（`ctx.getService('hover')`）供 overlay 读取
- pan 已作为内置 gesture（空白拖动/Space 平移）纳入手势互斥体系，不再使用独立 hook

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

#### edit
- `createAlignDistributePlugin`
- `createNudgePlugin`
- `createExportPngPlugin`

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

#### visual
- `createHoverHighlightPlugin`

#### hud
- `createContextMenuPlugin`
- `createToolbarPlugin`
- `createDefaultContextMenuPlugin`
- `createMinimapPlugin`
- `createRulersPlugin`
- `createZoomDockPlugin`

---

## 3. 默认编辑器包含哪些插件

### 3.1 `createDefaultEditorPlugins(opts?)`（不含 HUD）
默认顺序（简化描述，实际可通过 `createDefaultEditorPlugins()` 源码确认）：
1. keyboard-state
2. core-services
3. command-runner
4. shortcuts
5. history
6. view commands
7. z-index
8. export-png
9. snap guides
10. rotate3d（Alt + 拖）
11. group
12. lock/hide
13. selection
14. nudge
15. align-distribute
16. clipboard（可关）
17. rotate
18. resize
19. drag
20. marquee（默认开，且始终追加到最后）

> 备注：
> - snap 默认值已回归到 `createSnapGuidesPlugin` 内部默认（gridSize='auto' 等），默认组装不再写死 gridSize=48
> - view 的默认值（minZoom/maxZoom/zoomStep/paddingPx）已统一由 `createViewCommandsPlugin` 写入 `STORE_KEYS.viewConfig`

### 3.2 `createDefaultEditorPluginsWithUI(opts?)`（在 3.1 基础上追加 HUD）
- `createHoverHighlightPlugin`（默认开，放在最前面）
- `createToolbarPlugin`（默认关）
- `createZoomDockPlugin`（默认开）
- `createDefaultContextMenuPlugin`（默认关）
- `createRulersPlugin`（默认开）
- `createMinimapPlugin`（默认开）
- `createMarqueeSelectPlugin`（最后追加，避免与其它交互抢事件）

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

### 4.7 align / distribute
- `edit.alignLeft` / `edit.alignHCenter` / `edit.alignRight`
- `edit.alignTop` / `edit.alignVCenter` / `edit.alignBottom`
- `edit.distributeH` / `edit.distributeV`

### 4.8 export
- `file.exportPng`

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

> 详细字段说明见：[NodeData 字段参考](/infinite-map/library/node-data)