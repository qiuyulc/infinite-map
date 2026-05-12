# @qiuyulc/infinite-map-editor — 架构总览

> 本文档面向项目维护者和深度使用者，解释 editor 包的架构设计、插件体系和每个文件/目录的职责。

---

## 1. 包定位

`@qiuyulc/infinite-map-editor` 是 **编辑器插件集合 + 默认 UI**。

它不包含画布渲染能力（那在 `@qiuyulc/infinite-map` 中），只做一件事：**把编辑交互行为实现为可组合的插件**。

核心价值：
- 用户只需 `createDefaultEditorPluginsWithUI()` 一行代码获得完整编辑器
- 每个能力（selection/drag/history/…）都是独立插件，可按需启用/禁用
- 通过 `composePlugins()` 自动处理依赖关系和优先级排序

---

## 2. 目录结构

```
packages/infinite-map-editor/src/
├── index.ts                               # 包入口，统一导出
├── createDefaultEditorPluginsWithUI.ts     # 带 UI 的默认编辑器组装
│
├── editor/                                # === 编辑工具层 ===
│   ├── composePlugins.ts                  # 插件校验 + 拓扑排序
│   ├── createDefaultEditorPlugins.ts       # 默认插件集合（不含 UI）
│   ├── groupUtils.ts                      # 编组工具函数
│   ├── snapUtils.ts                       # 吸附计算工具
│   └── hitNormalize.ts                    # 命中规范化策略
│
├── plugins/                               # === 插件集合 (25+) ===
│   ├── index.ts                           # 插件统一导出
│   ├── createSelectionPlugin.tsx          # 选择服务 + overlay
│   ├── SelectionOverlay.tsx               # 选中框渲染
│   ├── createDragPlugin.ts                # 拖拽移动 + 吸附
│   ├── createResizePlugin.ts              # 8 点缩放
│   ├── createRotatePlugin.ts              # 2D 旋转
│   ├── createRotate3DPlugin.ts            # 3D 旋转 (Alt+拖拽)
│   ├── createHistoryPlugin.ts             # Undo/Redo
│   ├── createClipboardPlugin.ts            # 复制/剪切/粘贴/删除
│   ├── createMarqueeSelectPlugin.tsx       # 框选
│   ├── MarqueeOverlay.tsx                 # 框选矩形渲染
│   ├── createSnapGuidesPlugin.ts          # 吸附引导线
│   ├── SnapGuidesOverlay.tsx              # 引导线渲染
│   ├── createShortcutsPlugin.ts           # 快捷键映射
│   ├── createViewCommandsPlugin.ts        # 视图命令 (zoom/fit/center)
│   ├── createZIndexPlugin.ts              # 层级命令
│   ├── createKeyboardStatePlugin.ts       # 键盘状态 (Space/Ctrl/Shift)
│   ├── createCoreServicesPlugin.ts        # 核心服务注册
│   ├── createCommandRunnerPlugin.ts       # 命令执行引擎
│   ├── createGroupPlugin.ts               # 编组/解组
│   ├── createLockHidePlugin.ts            # 锁定/隐藏
│   ├── createAlignDistributePlugin.ts     # 对齐/分布
│   ├── createNudgePlugin.ts               # 键盘微调
│   ├── createExportPngPlugin.ts           # 导出 PNG
│   ├── createToolbarPlugin.tsx            # 工具栏
│   ├── createDefaultContextMenuPlugin.tsx  # 右键菜单
│   ├── createContextMenuPlugin.ts         # 右键菜单事件处理
│   ├── createMinimapPlugin.ts             # 小地图
│   ├── MinimapOverlay.tsx                 # 小地图渲染
│   ├── createRulersPlugin.tsx             # 标尺
│   ├── RulersOverlay.tsx                  # 标尺渲染
│   ├── createZoomDockPlugin.tsx           # 缩放滑杆
│   ├── createHoverHighlightPlugin.tsx     # 鼠标光晕
│   └── createDropToCreatePlugin.tsx       # 拖拽创建节点
│
├── components/                            # === 共享 UI 组件 ===
│   └── Slider.tsx                         # 滑杆组件 (ZoomDock 使用)
│
└── __tests__/                             # === 测试 (30+) ===
    ├── historyPlugin.test.ts
    ├── selectionPlugin.test.ts
    ├── dragPlugin.test.ts
    ├── clipboardPlugin.group.test.ts
    ├── rulersOverlay.interactions.test.tsx
    └── ...
```

---

## 3. 架构分层

```
Layer 1: @qiuyulc/infinite-map       核心包：渲染引擎 + 插件协议
           ↓
Layer 2: editor/ composePlugins       插件组合 + 校验 + 排序
           ↓
Layer 3: plugins/                     24 个独立插件，每个实现一种编辑能力
           ↓
Layer 4: createDefaultEditorPlugins*   默认组装入口（用户直接调用）
```

**Editor 包不修改 core 的任何代码**，所有能力通过 `InfiniteMapPlugin` 协议接入。

---

## 4. 插件分类

24 个插件按功能域分为 7 类：

| 分类 | 插件 | 说明 |
|---|---|---|
| **基础设施** | keyboard-state, core-services, command-runner, shortcuts | 键盘状态、服务注册、命令引擎、快捷键 |
| **选择** | selection, marquee-select | 点击选中/多选、框选 |
| **变换** | drag, resize, rotate, rotate3d | 拖拽、缩放、2D/3D 旋转 |
| **编辑** | history, clipboard, group, lock-hide, align-distribute, nudge, export-png | undo/redo、剪贴板、编组、锁定隐藏、对齐分布、微调、导出 |
| **HUD** | toolbar, context-menu, minimap, rulers, zoom-dock | 工具栏、右键菜单、小地图、标尺、缩放条 |
| **视觉** | hover-highlight, snap-guides | 鼠标光晕、吸附引导线 |
| **扩展** | drop-to-create | 拖拽创建节点 |

---

## 5. 文件详解

### 5.1 editor/ — 编辑工具层

#### `composePlugins.ts`
**插件组合器**。这是 editor 包的"装配车间"：

1. 过滤 `enabled === false` 的插件
2. 校验重复 id → 抛错
3. 收集 `provides` 声明 → 能力 map
4. 校验 `requires` → 缺失依赖抛错
5. 构建拓扑排序图：
   - `requires` → provider 必须在 consumer 之前
   - `order.before` / `order.after` → 显式顺序
6. 拓扑排序（Kahn 算法），同层按 `priority` 降序

**为什么需要 composePlugins？**
插件之间有依赖关系（如 clipboard 依赖 selection/history），也有优先级关系（如 resize 必须在 drag 之前，否则 resize handle 会被 drag 拦截）。手动排序容易出错，`composePlugins` 自动处理。

#### `createDefaultEditorPlugins.ts`
**默认插件集合（不含 UI）**。定义了"一个标准编辑器应该有哪些能力"：

```
keyboard-state → core-services → command-runner → shortcuts →
history → view-commands → z-index → export-png →
snap-guides → rotate3d → group → lock-hide →
selection → nudge → align-distribute → clipboard →
rotate → resize → drag → marquee
```

配置项：`DefaultEditorOptions`，按插件名分组提供配置（如 `marquee.requireShift`、`snap.gridSize`、`clipboard.enabled`）。

#### `groupUtils.ts`
**编组工具函数**。核心概念：

- `isGroupNode(n)`：判断是否为 group 节点
- `getDescendantIds(nodes, groupId)`：递归获取所有后代
- `getAncestorChain(byId, nodeId)`：获取祖先链
- `isLockedEffective` / `isHiddenEffective`：**传递规则**——祖先 locked/hidden 则后代视为 locked/hidden
- `expandIdsWithGroups`：展开 group id 为其所有后代 id

#### `snapUtils.ts`
**吸附计算工具**。核心概念：

- `SnapConfig`：吸附配置（enabled, gridSize, thresholdPx, guidesEnabled）
- `snapToGrid(value, gridSize)`：对齐到网格
- `bboxOf(nodes)`：计算节点集合的包围盒
- `setSnapGuides(ctx, guides, storeKey)`：写入吸附引导线（带去重）

#### `hitNormalize.ts`
**命中规范化策略**。当用户点击已选中 group 的后代节点时，将命中目标"提升"为 group。这样用户不用精确点到 group 外框也能拖动整组。按住 Alt 可绕过此策略。

---

### 5.2 plugins/ — 插件集合

#### 基础设施类

**`createCoreServicesPlugin.ts`**
注册核心服务到 `ctx.services`：
- `camera`：统一相机驱动接口
- `document`：统一 patches 入口
- `hud`：Toolbar / ContextMenu 的贡献注册表

**`createCommandRunnerPlugin.ts`**
命令执行引擎。将插件的 `commands` 注册到 `store.commands:registry`，提供统一的 `ctx.runCommand(id, payload)` 入口。

**`createKeyboardStatePlugin.ts`**
监听 `keydown`/`keyup`，维护 `Space` 键状态到 `store.keyboard:space`。drag/resize/pan 等插件读取此状态判断是否进入 Space 平移模式。

**`createShortcutsPlugin.ts`**
将快捷键映射到命令。支持 `commandShortcuts` 覆盖（`null` = 禁用）。只有在画布聚焦时生效（避免劫持页面全局快捷键）。

---

#### 选择类

**`createSelectionPlugin.tsx`**
实现选择服务。三个能力：

1. **HitTest**（`hitTests`）：检测指针是否命中节点，返回 `{kind:'node', id}`
2. **PointerDownProcessor**：处理选中逻辑——
   - 点击空白 → 清空选择
   - Shift+点击 → 切换选中（toggle）
   - 点击已选中节点 → 保持多选
   - 点击未选中节点 → 单选
   - 锁定节点 → 允许选中但返回 `{stop:true}` 阻断后续 gesture
3. **Overlay**（`SelectionOverlay`）：渲染选中框和 8 个缩放手柄

**`createMarqueeSelectPlugin.tsx`**
框选。空白拖拽时渲染矩形选框，松手后框内节点被选中。可配置 `requireShift`（Shift+拖拽才框选，避免与 pan 冲突）。

---

#### 变换类

**`createDragPlugin.ts`**
拖拽移动（最复杂的插件之一）。核心流程：

```
canStart → onStart(记录 startById) → onMove(计算偏移 + 吸附) → onEnd(提交 patches)
```

性能优化（Engine 模式）：
- `onMove` 阶段直接修改 DOM `transform`（不进入 React/patch 管线）
- `onEnd` 时才调用 `applyPatches` 提交最终位置
- 吸附计算包括：对齐线吸附、网格吸附、参考线吸附、视口中心线吸附

**`createResizePlugin.ts`**
8 点缩放手柄。提供 `hitTests`（handle 命中）和 `gesture`（resize 手势）。单选时显示，支持等比缩放（Shift）。

**`createRotatePlugin.ts`**
2D 旋转。提供旋转 handle 的 `hitTest` 和 `gesture`。

**`createRotate3DPlugin.ts`**
3D 旋转。`Alt + 拖拽` 修改 `rotationX/rotationY`。通过独立 handle 检测避免与 2D 旋转冲突。

---

#### 编辑类

**`createHistoryPlugin.ts`**
Undo/Redo。核心机制：

- 监听 `bus.on('patches:applied')`，对每个 patch 生成逆向 patch
- move-phase 合并：拖拽/缩放过程中，同一操作的多次 move 被合并为一个 undo 条目
- `cancelOngoingInteractions`：undo/redo 时清除活跃的 drag/resize/rotate 状态，避免状态冲突
- 存储到 `store.history:undoStack` / `history:redoStack`

**`createClipboardPlugin.ts`**
复制/剪切/粘贴/删除/副本。核心概念：

- 复制时生成节点快照，计算包围盒作为粘贴参考
- 粘贴时以视口中心为基准，支持连续粘贴偏移
- 支持 group 结构：复制时 remap `id` 并修正 `parentId`

**`createGroupPlugin.ts`**
编组/解组。选中多个节点 → `edit.group` 创建 group 节点，成员 `parentId` 指向 group。解组时删除 group，成员 `parentId` 清空。

**`createLockHidePlugin.ts`**
锁定/隐藏。锁定节点可被选中（便于解锁）但阻止 drag/resize/rotate。隐藏节点不渲染不命中。`showAll` 命令恢复所有隐藏节点。

**`createAlignDistributePlugin.ts`**
对齐/分布。计算选中节点集合的包围盒，按左/中/右/上/中/下对齐或水平/垂直等间距分布。

**`createNudgePlugin.ts`**
键盘微调。`↑↓←→` 移动 1px，`Shift+↑↓←→` 移动 10px。

**`createExportPngPlugin.ts`**
导出 PNG。触发 `export:png` 事件（骨架），由宿主实现截图逻辑。

---

#### HUD 类

**`createToolbarPlugin.tsx`**
工具栏。默认包含 undo/redo、zoom、fit/center、delete。支持插件贡献按钮（通过 `hud.addToolbarItems`）。可配置 `position`。

**`createDefaultContextMenuPlugin.tsx`**
右键菜单。默认包含剪贴板、层级、视图、删除、对齐分布。命中 group 后代时自动选中最外层 group。支持插件贡献菜单项。

**`createMinimapPlugin.ts`**
小地图。渲染节点缩略图和视口框。通过 `engine.store.subscribe` 订阅 camera 变化，直接操作 Canvas 绘制。

**`createRulersPlugin.tsx`**
标尺。顶部/左侧显示世界坐标刻度。自适应 zoom（使用 `computeAdaptiveSteps`）。支持标尺拖拽平移和参考线拖放。使用 imperative DOM 操作（非 React 渲染，性能原因）。

**`createZoomDockPlugin.tsx`**
缩放滑杆。右下角 slider + 吸附开关。通过 `apiRef.runCommand('view.zoomIn')` 等驱动缩放。

---

#### 视觉类

**`createHoverHighlightPlugin.tsx`**
鼠标光晕。通过 `inputHooks.onBeforeHitTest` 追踪鼠标位置，Canvas 渲染径向渐变 + 点阵高亮。滚轮时有脉冲动画。

**`createSnapGuidesPlugin.ts`**
吸附引导线。从 `store.snap:guides` 读取吸附位置，渲染对齐线 overlay。

---

#### 扩展类

**`createDropToCreatePlugin.tsx`**
拖拽创建节点。监听 `document` 的 `dragover`/`drop` 事件，通过 `ctx.screenToWorld` 计算世界坐标，调用 `applyPatches` 创建节点。包含 ghost 预览 overlay。

---

## 6. 插件生命周期

```
用户调用 createDefaultEditorPluginsWithUI(opts)
  ↓
createDefaultEditorPlugins(opts)  // 生成 core 插件列表
  ↓
追加 HUD 插件（toolbar/zoomDock/…）
  ↓
composePlugins(plugins)  // 校验 + 排序
  ↓
<InfiniteMap plugins={plugins} />
  ↓
InfiniteMap 内部:
  usePluginLifecycle → 逐个调用 plugin.setup(ctx)
  useCommandRegistry → 收集 commands 到 registry
  usePluginInputDispatch → 收集 hitTests/gestures/processors
  RenderPluginOverlays → 按 slot 渲染 overlay
```

**teardown** 清理：组件卸载或 plugins 变化时，调用每个插件的 `teardown()`，解绑事件、清理 store。

---

## 7. 默认编辑器配置

`createDefaultEditorPluginsWithUI()` 的可配置项：

```ts
{
  rulers:        { enabled: true, thickness: 24 },
  minimap:       { enabled: true, width: 260, height: 160 },
  zoomDock:      { enabled: true },
  toolbar:       { enabled: false },
  contextMenu:   { enabled: false },
  hoverHighlight:{ enabled: true },
  marquee:       { enabled: true, requireShift: false },
  snap:          { enabled: true, guidesEnabled: true, gridSize: 'auto' },
  clipboard:     { enabled: true },
  shortcuts:     { commandShortcuts: {...} },
  selection:     { clearOnBlankClick: true },
  drag:          { selectOnDrag: true },
  resize:        { ... },
  view:          { paddingPx: 48, zoomStep: 1.2 },
  history:       { limit: 200 },
}
```

---

## 8. 关键设计决策

### 8.1 为什么 selection 用 `pointerDownProcessor` 而不是 `gesture`？

Selection 是非互斥逻辑：点击节点时，selection 和 drag 可能同时需要响应。`pointerDownProcessor` 在 gesture 启动前执行，selection 可以修改 `hit` 对象（如将子节点命中提升为 group 命中），然后 gesture 基于修改后的 `hit` 启动。

### 8.2 为什么 drag move 阶段直接操作 DOM？

拖拽时每帧产生 move patch。如果走 React 的 `applyPatches → onNodesChange → setState → re-render` 路径，会触发整棵 Fiber 树重渲染（包含所有节点）。改为直接操作 `el.style.transform`，end 时一次性提交最终位置，性能提升显著。

### 8.3 为什么 history 需要 `cancelOngoingInteractions`？

如果用户在拖拽过程中按 Undo，history 回滚节点位置，但 drag 插件仍持有旧 `startById`。下一次 `pointermove` 会用旧数据覆盖新位置。`cancelOngoingInteractions` 在 undo/redo 时强制清除所有活跃手势状态。

### 8.4 为什么标尺用 imperative DOM 而非 React？

标尺刻度随 camera 平移/缩放高频变化（每帧）。React 渲染会产生大量 Fiber 任务，导致拖拽时卡顿。改为 `engine.store.subscribe + rAF + document.createElementNS` 直接操作 SVG DOM。

---

## 9. 对外导出

从 `index.ts` 导出：

- **组装入口**：`createDefaultEditorPlugins`、`createDefaultEditorPluginsWithUI`
- **组合器**：`composePlugins`
- **插件工厂**：`EditorPlugins.*`（命名空间导出全部 24 个插件工厂）
- **HUD 插件**（根入口直接导出）：`createToolbarPlugin`、`createDefaultContextMenuPlugin`、`createMinimapPlugin`、`createRulersPlugin`、`createZoomDockPlugin`、`createDropToCreatePlugin`
- **编辑工具**：`groupUtils`、`snapUtils`
- **类型**：所有 Options 类型、`DropToCreatePluginOptions` 等
- **再导出**：`InfiniteMapPlugin`、`MapContext`、`NodePatch`、`ChangeMeta`（从 core 包）

---

## 10. 相关文档

- [编辑器快速上手](/docs/infinite-map-editor/quickstart) — 5 分钟接入指南
- [插件开发指南](/docs/infinite-map-editor/plugin-development) — 编写自定义插件（含完整模板）
- [插件 API 参考](/docs/infinite-map-editor/plugin-reference) — 24 个内置插件详解
- [编辑器定制](/docs/infinite-map-editor/customization) — 定制工具栏/右键菜单/HUD/主题
