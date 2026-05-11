# @qiuyulc/infinite-map — 架构总览

> 本文档面向项目维护者和深度使用者，逐层解释核心包的架构设计、数据流和每个文件/目录的职责。

---

## 1. 包定位

`@qiuyulc/infinite-map` 是**无限画布渲染引擎 + 插件协议**。

它不包含任何编辑器交互逻辑（selection/drag/resize/...），这些都在 `@qiuyulc/infinite-map-editor` 中。核心包只做三件事：

1. **渲染**：节点、背景、视口变换
2. **协议**：定义插件如何接入输入管线、产生变更、注册 UI
3. **运行时**：协调 React 组件、Zustand engine store、原生 DOM 操作三者之间的关系

---

## 2. 目录结构

```
packages/infinite-map/src/
├── index.ts                       # 包入口，统一导出
├── theme.ts                       # 主题定义 (light/dark) + CSS 变量映射
├── theme-base.css                 # 基础 CSS 变量
│
├── core/                          # === 最底层：纯函数，无 React 依赖 ===
│   ├── types.ts                   # Camera / NodeData / Rect 类型 + rectIntersects
│   ├── spatialIndex.ts            # 均匀网格空间索引 (build / query)
│   ├── utils.ts                   # clamp / cssVar / cssVarNum / cssVarRgb
│   └── steps.ts                   # 自适应刻度步长算法 (computeAdaptiveSteps)
│
├── engine/                        # === 性能层：Zustand vanilla store ===
│   ├── engineStore.ts             # 引擎 store 定义 + createEngineStore
│   ├── useEngineSelector.tsx       # React 订阅工具 (useSyncExternalStore)
│   └── index.ts                   # engine 模块统一导出
│
├── editor/                        # === 协议层：插件系统类型 & 运行时 ===
│   ├── types.ts                   # 所有协议类型 (Plugin/Gesture/HitTest/Patch/...)
│   ├── runtime.ts                 # createEventBus / createStore / applyPatchesToNodes
│   ├── keys.ts                    # STORE_KEYS：所有跨插件共享的 store key
│   └── document.ts                # Doc 序列化/反序列化 (serializeDoc/parseDoc)
│
├── hooks/                         # === React hooks：功能单元 ===
│   ├── useViewportSize.ts         # ResizeObserver → viewport state + ref
│   ├── useVisibleNodes.ts         # 虚拟化：计算可见节点列表
│   ├── useWheelControls.ts        # wheel/pinch → camera 更新
│   ├── useCoordinateTransforms.ts # screen↔world 坐标变换 (useCallback)
│   ├── useMapContext.ts           # 组装 MapContext 对象
│   ├── usePatchEngine.ts          # Patch 引擎：rAF 合并 / history / hooks
│   ├── usePluginInputDispatch.ts  # Scheme C 输入管线 (hitTest→gesture)
│   ├── usePluginLifecycle.ts      # 插件 setup/teardown 生命周期
│   ├── useCommandRegistry.ts      # 命令注册 (冲突检测 + 合并)
│   ├── useRunCommandWithHooks.ts  # 命令执行 + hooks 拦截
│   ├── useAttachApiRef.ts         # apiRef 实现
│   ├── useMapRuntimeEffects.ts    # wheel / highlight / minimap 运行时效果
│   ├── useInjectedThemeVars.ts    # theme prop → CSS 变量注入
│   └── useThemeVersion.ts         # 主题版本号 (强制重绘 Minimap)
│
├── components/                    # === React 组件 ===
│   ├── InfiniteMap.tsx            # 主组件：组装一切 (~800 行核心)
│   ├── InfiniteMapThemeProvider.tsx # 主题提供者 (注入 CSS 变量)
│   ├── DefaultNode.tsx            # 默认节点渲染
│   ├── EngineBackgroundLayer.tsx  # 背景层 (点阵/网格)
│   ├── EngineDomNodesLayer.tsx    # DOM 节点层 (虚拟化 + keepAlive)
│   ├── RenderDomNodes.tsx         # 单个节点渲染 (定位/旋转/3D)
│   ├── RenderPluginOverlays.tsx   # 插件 overlay 渲染 (background/overlay/hud 三层)
│   └── OverlayErrorBoundary.tsx   # Overlay 错误边界
│
├── layout/                        # 布局算法
│   └── layoutPresets.ts           # 预置布局 (grid/random/custom)
│
├── demo/                          # Demo 数据
│   ├── demoNodes.ts               # makeDemoNodes()
│   └── index.ts
│
└── ui/                            # UI 子入口
    └── index.ts                   # 再导出核心 UI 组件
```

---

## 3. 架构分层

```
Layer 1: core/         纯函数，零依赖，可被任何层调用
           ↓
Layer 2: engine/       Zustand store，高频状态不走 React
           ↓
Layer 3: editor/       插件协议类型 + 轻量运行时 (bus/store/patch)
           ↓
Layer 4: hooks/        React hooks，连接 engine ↔ React ↔ DOM
           ↓
Layer 5: components/   React 组件，组装 hooks + engine + overlays
```

**关键原则：高频状态不走 React Fiber。**

视口 transform、相机、可视节点列表等高频数据存在 Zustand store 中，通过 `subscribe` + rAF 直接操作 DOM，不让 React 参与。

---

## 4. 数据流全景

```
                        ┌─────────┐
                        │  用户输入  │
                        └────┬────┘
                             │
                    ┌────────▼─────────┐
                    │ usePluginInputDispatch │ ← Scheme C 输入管线
                    │ (hitTest→processor→gesture)│
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   ┌──────────┐     ┌──────────────┐    ┌──────────┐
   │ camera   │     │ applyPatches │    │  hover   │
   │ 变更     │     │ (move/resize)│    │ 变更     │
   └────┬─────┘     └──────┬───────┘    └────┬─────┘
        │                  │                 │
   ┌────▼─────┐     ┌──────▼───────┐        │
   │ engine   │     │ patch engine │        │
   │ store    │     │ (rAF 合并)    │        │
   │ setView  │     └──────┬───────┘        │
   │ setVPort │            │                │
   └────┬─────┘     ┌──────▼───────┐        │
        │           │ onNodesChange│        │
        │           │ onPatches    │        │
        │           └──────┬───────┘        │
        │                  │                │
   ┌────▼──────────────────▼────────────────▼──┐
   │              React State / store           │
   │  viewport, nodes, hoverHit, selectionIds…  │
   └────────────────────┬──────────────────────┘
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
   ┌───────────┐ ┌───────────┐ ┌───────────┐
   │ Engine    │ │ Engine    │ │ Plugin    │
   │ Background│ │ DomNodes  │ │ Overlays  │
   │ Layer     │ │ Layer     │ │ (3 slots) │
   │ (subscribe│ │ (subscribe│ │ (React +  │
   │  + rAF)   │ │  + rAF)   │ │  request  │
   └───────────┘ └───────────┘ │  Render)  │
                               └───────────┘
```

**两条渲染路径：**

| 路径 | 驱动方式 | 用于 |
|---|---|---|
| **原生轨道** | `engine.store.subscribe()` + rAF → 直接写 DOM style | 背景、节点层 transform、标尺刻度 |
| **React 轨道** | state 变更 → React re-render | 节点内容、插件 overlay |

---

## 5. 文件详解

### 5.1 core/ — 纯函数层

#### `types.ts`
定义三个核心类型：
- **`Camera`**：`{ x, y, zoom }`。x/y 是世界坐标中视口左上角的位置，zoom 是缩放倍率。
- **`NodeData`**：节点的完整数据结构，包含几何（x/y/width/height/rotation…）、层级（z）、编组（kind/parentId）、编辑器状态（locked/hidden）和业务数据（label/color/data/resourceId）。
- **`Rect`**：`{ x, y, w, h }` + 碰撞检测函数 `rectIntersects`。

#### `spatialIndex.ts`
**均匀网格空间索引**。用于虚拟化（视口裁剪）：

- `buildSpatialIndex(nodes, cellSize)`：将节点按世界坐标分配到网格单元。构建 O(n)。
- `querySpatialIndex(index, rect)`：查询与指定矩形相交的所有节点。只扫描覆盖到的格子。

这是大规模节点场景性能的基础——视口外节点不参与 DOM 渲染。

#### `utils.ts`
工具函数：
- `clamp(v, min, max)` — 值限制
- `cssVar(name, fallback, el?)` — 读 CSS 变量字符串
- `cssVarNum(name, fallback, el?)` — 读 CSS 变量为数字
- `cssVarRgb(name, fallback, el?)` — 读 CSS 变量为 RGB（Canvas 用，需逗号分隔）

#### `steps.ts`
**自适应步长算法**。用于标尺刻度、网格间距、网格吸附：

- `niceStep(raw)`：将任意数值规整到 1/2/5 × 10^n（图表学经典算法）
- `computeAdaptiveSteps(zoom, opts)`：根据当前 zoom 计算主刻度/小刻度的世界间距。保证无论缩放级别如何变化，刻度线的视觉密度（像素间距）保持稳定。

```
zoom 0.5 → 刻度稀疏（世界间距大）
zoom 2.0 → 刻度密集（世界间距小）
```

---

### 5.2 engine/ — Zustand 性能层

#### `engineStore.ts`
**引擎 store**（Zustand vanilla）。这是整个画布的"真相源"：

| 字段 | 类型 | 说明 |
|---|---|---|
| `view` | `ViewSnapshot` | camera + 预计算的 CSS transform 字符串 |
| `viewport` | `{w, h}` | 画布 DOM 容器尺寸 |
| `interaction` | `{panning, draggingNode}` | 交互状态标记 |
| `visibleNodeIds` | `string[]` | 当前可见节点 ID 列表（虚拟化结果） |

关键操作：
- `setView(camera)`：更新相机，自动计算 `transform` 字符串
- `setViewport(vp)`：更新视口尺寸（由 ResizeObserver 驱动）
- `setVisibleNodeIds(ids)`：更新可见节点列表

`cameraToTransform(cam)` 将 camera 转换为 `translate3d(-x*zoom, -y*zoom, 0) scale(zoom)` 直接写入 DOM。

**为什么用 Zustand vanilla 而不是 React state？**
因为 camera 变化频率极高（拖拽/缩放时每帧更新），用 React state 会导致全树重渲染。Zustand 的 `subscribe` + 选择器直接操作 DOM，绕过 React。

#### `useEngineSelector.tsx`
将 Zustand vanilla store 桥接到 React：

```ts
function useEngineSelector<T>(store, selector, equalityFn): T
```

底层用 `useSyncExternalStore`，保证 React 18 并发模式下的撕裂安全。**只能用于低频订阅**（如 visibleNodeIds 变化），禁止用于高频字段（view/camera）。

---

### 5.3 editor/ — 协议层

#### `types.ts`
定义了整个插件系统的协议类型。核心概念：

**Patch 系统：**
```
NodePatch = move | set | add | remove
ChangeMeta = { source, plugin, reason, phase?, ids? }
```
编辑器通过产生 Patch 流来描述所有变更，而非直接修改数据。这为 undo/redo、协作同步、审计日志提供了统一基础。

**输入管线 (Scheme C)：**
```
HitTest → PointerDownProcessors → Gestures
```
- `HitTestContributor`：每个插件可以贡献命中检测逻辑
- `PointerDownProcessor`：非互斥逻辑（如 selection），可在 gesture 启动前执行
- `Gesture`：互斥手势（drag/resize/rotate/pan），同一时刻只有一个活跃

**MapContext：** 插件运行时上下文，提供：
- 只读数据访问（getCamera/getViewport/getNodes/getVisibleNodes）
- 坐标变换（screenToWorld/worldToScreen）
- 数据变更出口（applyPatches）
- 总线与共享状态（bus/store）
- 服务容器（registerService/getService）

**InfiniteMapPlugin：** 插件定义，包含：
- 身份（id/provides/requires/order/priority）
- 生命周期（setup/teardown）
- 输入（hitTests/gestures/processors/inputHooks）
- UI（overlay + slot + overlayPointerEvents）
- 命令（commands）

#### `runtime.ts`
轻量运行时实现：

- `createEventBus()`：发布/订阅事件总线。支持类型安全的事件表（EventMap），handler 内取消订阅不会影响遍历（先拷贝 Set）。
- `createStore()`：key-value 共享状态。`subscribe(key)` 在值变化时通知监听者。
- `applyPatchesToNodes(nodes, patches)`：纯函数，将 patches 应用到节点数组。支持 move/set/add/remove 四种操作。

#### `keys.ts`
集中管理所有跨插件共享的 store key（避免散落 string literal）：

```
selectionIds, marqueeState, keyboardSpace, hoverHit  ← 输入状态
dragState, resizeState, rotateState                   ← 手势状态
snapConfig, snapGuides                                 ← 吸附
clipboardData, clipboardPasteCount                    ← 剪贴板
historyUndoStack, historyRedoStack                    ← 历史
viewConfig, viewPanEnabled, viewPanActive              ← 视图
minimapConfig, minimapNeedsRedraw                      ← 小地图
contextMenuState, toolbarItems, contextMenuItems       ← HUD
```

#### `document.ts`
画布状态的序列化与反序列化：

- `serializeDoc({nodes, camera, resources?, meta?})`：导出为 `InfiniteMapDoc`（schemaVersion=1）
- `parseDoc(input)`：校验并解析 doc。严格校验 schemaVersion/nodes/camera 结构，不兼容旧版本格式。
- `DOC_SCHEMA_VERSION = 1`：当前版本号。Breaking change 时递增，不做历史兼容（避免心智负担）。

---

### 5.4 hooks/ — React 功能单元

#### `useViewportSize.ts`
**视口尺寸监听**。核心逻辑：

```
ResizeObserver → rAF 去抖 → setState + 同步更新 viewportRef
```

关键设计：`viewportRef.current` 在 rAF 回调中**同步更新**（不等 useEffect），确保 `ctx.getViewport()` 在下一次渲染时拿到最新值。这是之前标尺首次加载不显示 bug 的修复点。

#### `useVisibleNodes.ts`
**虚拟化计算**。核心逻辑：

```
spatialIndex + viewWorldRect → querySpatialIndex → filter by rectIntersects
→ sort by z → result
```

仅当 camera 或 viewport 变化时重新计算（rAF 去抖）。`visibleNodesRef` 保持最新结果供插件 `ctx.getVisibleNodes()` 读取。

#### `useWheelControls.ts`
**滚轮/触控板事件处理**。核心逻辑：

- `wheel` 事件：preventDefault + 坐标计算 → commitCamera
- `pinch`（ctrlKey=true）：缩放；`pan`（两指拖动）：平移
- `pulseRef`：记录滚轮事件的"脉冲强度"，供高亮层使用
- `gesturestart/change/end`：阻止浏览器默认手势

#### `useCoordinateTransforms.ts`
**坐标变换函数**（useCallback 稳定引用）：

- `screenToWorld(p)`：屏幕像素 → 世界坐标
- `worldToScreen(p)`：世界坐标 → 屏幕像素
- `rectScreenToWorld(r)` / `rectWorldToScreen(r)`：矩形变换

```
worldX = camera.x + screenX / camera.zoom
worldY = camera.y + screenY / camera.zoom
```

#### `useMapContext.ts`
**组装 MapContext 对象**。通过 `useMemo` 创建一个稳定的 context 对象，所有 getter 方法读取 ref（而非 state），保证无论在渲染阶段还是事件回调中都能拿到最新值。

#### `usePatchEngine.ts`
**Patch 引擎**。是整个项目的"变更核心"：

```
applyPatches(patches, meta)
  ├─ onBeforeApplyPatches hook (可选拦截/修改)
  ├─ move-phase？→ 合并到 rAF 批量提交
  ├─ 非 move-phase：
  │   ├─ 采样 beforeById（供 history undo 用）
  │   ├─ bus.emit('patches:applied')
  │   ├─ onPatches(patches, meta)  // 如果提供
  │   ├─ applyPatchesToNodes → onNodesChange(next)  // 如果提供
  │   └─ onAfterApplyPatches hook
  └─ return
```

move-phase 的 rAF 合并是关键性能优化：拖拽/缩放过程中每帧产生 move patch，合并后一次性提交，避免高频 setState。

#### `usePluginInputDispatch.ts`
**Scheme C 输入管线**。~350 行核心逻辑，处理所有 pointer/key/contextmenu 事件：

```
Pointer Down:
  1. 采样 containerRect
  2. screen → world 坐标转换
  3. hitTest（按 priority 排序的 hitTestContributors）
  4. pointerDownProcessors（selection 等非互斥逻辑）
  5. gesture canStart → onStart（第一个匹配的互斥手势）

Pointer Move/Up/Cancel:
  → 派发给 active gesture

Hover (move + 无 active gesture):
  → hitTest → hoverRef → cursor 更新 → bus.emit('hover:change')

Key:
  → window keydown/keyup → 按插件顺序分发
```

**内置 pan gesture**（priority=-9999 兜底）：Space 平移模式或空白拖拽平移，通过 `commitCamera` 驱动相机。

#### `usePluginLifecycle.ts`
**插件生命周期管理**。遍历 plugins 数组，对每个启用的插件调用 `setup(ctx)`，返回 cleanup 时调用 `teardown()`。错误隔离：单个插件的 setup/teardown 抛错不影响其他插件。

#### `useCommandRegistry.ts`
**命令注册**。收集所有插件的 `commands`，合并到 `store.set('commands:registry')`。支持冲突策略（keep-first/override/error）和 DEV 告警。

#### 其他 hooks
- `useRunCommandWithHooks`：命令执行 + before/after hooks
- `useAttachApiRef`：将内部能力绑定到 `apiRef`（供宿主调用）
- `useMapRuntimeEffects`：wheel highlight + minimap config + 容器 focus 管理
- `useInjectedThemeVars`：将 `theme` prop 转换为 CSS 变量
- `useThemeVersion`：跟踪主题变化，供 Minimap 强制重绘

---

### 5.5 components/ — React 组件

#### `InfiniteMap.tsx`（核心组件，~800 行）

这是整个包的入口组件。组装顺序：

```
InfiniteMap(props)
  └─ InfiniteMapEngine(props)     ← 实际实现
       ├─ useRef: containerRef, viewportDomRef
       ├─ createEngineStore(initialCamera)     ← Zustand store
       ├─ useViewportSize(containerRef)        ← 视口尺寸
       ├─ useEffect: sync viewport → engine store
       ├─ useVisibleNodes / spatialIndex       ← 虚拟化
       ├─ useCoordinateTransforms              ← 坐标变换
       ├─ useMapContext                        ← ctx 对象
       ├─ registerService('engine', ...)       ← 注册 engine 服务
       ├─ registerService('dom-nodes', ...)    ← 注册 DOM 查询服务
       ├─ useCommandRegistry / usePluginLifecycle
       ├─ usePatchEngine                       ← patch 引擎
       ├─ usePluginInputDispatch               ← 输入管线
       ├─ useAttachApiRef                      ← apiRef
       ├─ useMapRuntimeEffects                 ← wheel/highlight
       │
       └─ return JSX:
            <div ref={containerRef} data-im-theme>
              <EngineBackgroundLayer />          ← z-index: 0
              <RenderPluginOverlays slot="background" /> ← z-index: 1
              <div ref={viewportDomRef} transform>     ← z-index: 2
                <EngineDomNodesLayer />          ← 节点层
              </div>
              <RenderPluginOverlays slot="overlay" />   ← z-index: 20
              <RenderPluginOverlays slot="hud" />        ← z-index: 30
            </div>
```

**DOM 层级（z-index 从低到高）：**

| Layer | z-index | 内容 | 渲染方式 |
|---|---|---|---|
| background | 0 | 点阵/网格背景 | subscribe + rAF 直接写 DOM |
| plugin background | 1 | 插件背景层 | React overlay |
| viewport | 2 | 节点 + transform | subscribe + rAF 写 transform |
| plugin overlay | 20 | 编辑辅助层（选框/对齐线/框选） | React overlay |
| plugin hud | 30 | 界面层（minimap/标尺/面板） | React overlay |

#### `EngineBackgroundLayer.tsx`
背景渲染组件。通过订阅 `engine.store` 的 view/viewport 变化，用 rAF 直接写 DOM style（背景点阵的 pattern offset 需跟随 camera 移动）。避免 React 重渲染。

#### `EngineDomNodesLayer.tsx`
节点层渲染。订阅 `engine.store` 的 `visibleNodeIds`，只渲染虚拟化后的节点。通过 `nodesById` Map 快速查找节点数据。支持 keepAlive 和 panKeepAlive。

#### `RenderPluginOverlays.tsx`
渲染插件 overlay。按 `slot` 过滤插件，对每个启用的插件调用 `p.overlay({ ctx })`。包裹在 `OverlayErrorBoundary` 中，单个插件渲染错误不影响其他插件。

#### `DefaultNode.tsx`
默认节点渲染。纯展示组件：标题 + 可选坐标 meta + 自定义内容区。

#### `InfiniteMapThemeProvider.tsx`
主题提供者。将 `InfiniteMapTheme` 对象转换为 CSS 变量注入到容器元素。

---

## 6. 关键设计决策

### 6.1 为什么有两套渲染路径？

React 擅长声明式 UI，但 camera 变化（拖拽/缩放）每帧触发，用 React state 会导致整棵 Fiber 树重渲染。因此：

- **高频更新**（camera/viewport/visibleNodeIds 变化）→ Zustand subscribe + rAF → 直接操作 DOM
- **低频更新**（节点内容、插件 overlay、selection 框）→ React state → React re-render

### 6.2 为什么用 ref 而不是 state 传数据给插件？

`MapContext` 的 getter 方法（`getCamera`/`getViewport`/`getNodes`）都读取 `ref.current`。这样：

- 在 render 阶段和事件回调中都能拿到最新值
- 不因 ref 变化触发 React re-render
- 多个插件在同一帧内读取数据保持一致性

### 6.3 为什么 move patch 要 rAF 合并？

拖拽/缩放过程中，鼠标每移动 1px 就产生一个 patch。如果不合并，每秒 60 次 `setState` + `onNodesChange`，会导致严重的性能问题和 UI 闪烁。rAF 合并后，一帧内所有 move patch 被合并为一次提交。

### 6.4 为什么 doc schema 不做历史兼容？

`parseDoc` 只接受当前版本。因为：
1. 项目仍处于 0.x 阶段，格式频繁变化
2. 历史迁移矩阵会随版本数指数增长
3. 业务侧可以自己处理旧格式转换

---

## 7. 对外导出

从 `index.ts` 导出：

- **组件**：`InfiniteMap`、`InfiniteMapThemeProvider`、`DefaultNode`
- **类型**：`Camera`、`NodeData`、`Rect`、`InfiniteMapPlugin`、`MapContext`、`NodePatch`、`ChangeMeta`、`Command` 等
- **主题**：`InfiniteMapTheme`、`lightTheme`、`darkTheme`、`mergeTheme`、`themeToCSSVars`
- **工具**：`rectIntersects`、`computeLayout`、`applyPatchesToNodes`、`STORE_KEYS`、`VISUAL_CONST`
- **Demo**：`makeDemoNodes`
- **子入口**：`@qiuyulc/infinite-map/ui`、`@qiuyulc/infinite-map/demo`
