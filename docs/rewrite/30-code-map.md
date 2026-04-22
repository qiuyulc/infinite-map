# 30. 代码地图：每个文件夹/文件负责什么（packages/infinite-map/src）

这页只解决一件事：

> 你想改某个功能时，应该去哪个文件找？

范围：**只标注库源码** `packages/infinite-map/src`（不含 playground/docs）。

---

## 0）先记住项目分层（看目录就不会迷路）

```txt
src/
  core/        纯数据与算法（尽量不依赖 React）
  editor/      编辑器系统（插件/命令/历史/剪贴板/HUD 插件等）
  components/  React 组件（InfiniteMap、DefaultNode、Minimap、Slider…）
  hooks/       React hooks（camera、wheel、viewport、可见节点计算…）
  layout/      demo 布局算法（computeLayout）
  demo/        demo 数据（makeDemoNodes）
  index.ts     对外导出（使用者从这里 import）
  theme.ts     主题 token → CSS vars 映射
```

---

## 1）顶层入口

| 文件 | 作用 | 关键导出（部分） |
|---|---|---|
| `index.ts` | 对外导出入口（使用者 import 的集合） | `InfiniteMap`、`createDefaultEditorPlugins`、`EditorPlugins`… |
| `theme.ts` | 主题 token 与 CSS vars 映射 | `lightTheme`、`darkTheme`、`themeToCSSVars`… |

---

## 2）components/（React 组件）

| 文件 | 作用 | 关键导出（部分） |
|---|---|---|
| `components/InfiniteMap.tsx` | **画布主组件**：渲染背景/节点/overlay/hud + 装配 plugins | `InfiniteMap`、`InfiniteMapProps`、`InfiniteMapApi` |
| `components/DefaultNode.tsx` + `.css` | 默认节点外观（圆角/阴影/主题变量） | `DefaultNode` |
| `components/Minimap.tsx` | Minimap 的 canvas 渲染与交互 | `Minimap` |
| `components/Slider.tsx` + `.css` | 自研 slider（给 ZoomDock 等 HUD 用） | `Slider` |
| `components/BackgroundGrid.tsx` | 网格背景 | `BackgroundGrid` |
| `components/BackgroundDots.tsx` | 点阵背景 | `BackgroundDots` |
| `components/InfiniteMapThemeProvider.tsx` | 把主题 CSS vars 注入到容器（局部生效） | `InfiniteMapThemeProvider` |

---

## 3）hooks/（React hooks）

| 文件 | 作用 |
|---|---|
| `hooks/useCamera.ts` | camera 状态 + ref + commitCamera（给 minimap/commands 复用） |
| `hooks/useViewportSize.ts` | 容器 viewport（w/h）追踪 |
| `hooks/useWheelControls.ts` | 滚轮/触控板缩放与相关手感（含 pinch） |
| `hooks/usePointerPan.tsx` | 指针平移（Space 拖拽）与鼠标位置 ref |
| `hooks/useVisibleNodes.ts` | 可见节点虚拟化（camera/viewport/overscan） |
| `hooks/useHighlightLayer.ts` | 高亮 canvas（鼠标附近光晕/脉冲） |
| `hooks/useThemeVersion.ts` | 主题版本号（用于触发 canvas 重绘） |

---

## 4）core/（数据与算法）

| 文件 | 作用 |
|---|---|
| `core/types.ts` | 核心类型：`NodeData`、`Camera`、`Rect` + `rectIntersects` |
| `core/spatialIndex.ts` | 空间索引：加速“查询某个矩形里的节点” |
| `core/steps.ts` | 自适应刻度（网格/标尺/点阵的 step） |
| `core/utils.ts` | 工具函数：`clamp`、读取 CSS vars 等 |

---

## 5）editor/（编辑器系统：插件化）

### 5.1 editor/ 顶层文件（基础设施）

| 文件 | 作用 |
|---|---|
| `editor/types.ts` | Editor 侧核心类型：`MapContext`、`InfiniteMapPlugin`、`Command`、事件类型等 |
| `editor/runtime.ts` | 创建 `store/bus`、patch 应用 `applyPatchesToNodes` 等运行时工具 |
| `editor/composePlugins.ts` | 插件组合（排序/依赖处理等） |
| `editor/createDefaultEditorPlugins.ts` | 默认插件集合（“开箱即用编辑器”） |
| `editor/keys.ts` | store keys（插件共享状态统一命名） |
| `editor/snapUtils.ts` | 吸附算法与工具（grid/guide/viewport center 等） |

### 5.2 editor/plugins/（按领域分组的功能插件）

> 记法：`core`=基础能力；`selection/transform/snapping/clipboard`=交互能力；`hud`=界面层。

| 文件 | 作用 |
|---|---|
| `editor/plugins/core/createCoreServicesPlugin.ts` | 注册基础 services（例如 camera/selection/document 等） |
| `editor/plugins/core/createCommandRunnerPlugin.ts` | 提供 `ctx.runCommand` 的实现/回退逻辑 |
| `editor/plugins/core/createShortcutsPlugin.ts` | 监听键盘并触发 command |
| `editor/plugins/core/createViewCommandsPlugin.ts` | zoom/fit/center 等视图命令 |
| `editor/plugins/core/createHistoryPlugin.ts` | undo/redo（通过 patches:applied 等事件） |
| `editor/plugins/core/createZIndexPlugin.ts` | zIndex 调整命令 |
| `editor/plugins/core/createKeyboardStatePlugin.ts` | 维护 Space/Shift 等键盘状态（给 pan/marquee/drag 用） |
| `editor/plugins/selection/createSelectionPlugin.tsx` | 点击选中/多选规则 + selection service |
| `editor/plugins/selection/createMarqueeSelectPlugin.tsx` | 框选（marquee） |
| `editor/plugins/selection/SelectionOverlay.tsx` | 选中框 UI |
| `editor/plugins/selection/MarqueeOverlay.tsx` | 框选 UI |
| `editor/plugins/transform/createDragPlugin.ts` | 拖拽移动（支持多选整体移动） |
| `editor/plugins/transform/createResizePlugin.ts` | resize（8个 handle） |
| `editor/plugins/transform/createRotatePlugin.ts` | 2D 旋转 |
| `editor/plugins/transform/createRotate3DPlugin.ts` | 3D 旋转（Alt/Option + drag） |
| `editor/plugins/snapping/createSnapGuidesPlugin.ts` | 吸附规则 + 产出 guides |
| `editor/plugins/snapping/SnapGuidesOverlay.tsx` | 吸附辅助线 UI |
| `editor/plugins/clipboard/createClipboardPlugin.ts` | copy/cut/paste/duplicate 等命令 |
| `editor/plugins/hud/createToolbarPlugin.tsx` | 默认工具栏 UI（触发 commands） |
| `editor/plugins/hud/createContextMenuPlugin.ts` | 右键菜单状态层（何时打开/坐标） |
| `editor/plugins/hud/createDefaultContextMenuPlugin.tsx` | 默认右键菜单 UI（触发 commands） |
| `editor/plugins/hud/createMinimapPlugin.ts` + `MinimapOverlay.tsx` | minimap HUD 适配层 |
| `editor/plugins/hud/createZoomDockPlugin.tsx` | 缩放 slider HUD（与 minimap 联动布局） |
| `editor/plugins/hud/createRulersPlugin.tsx` + `RulersOverlay.tsx` | 标尺 HUD |

---

## 6）下一步：我要“看懂关键文件”，从哪几篇开始？

我们已经为核心入口准备了“带注释讲解”的文档：

- `components/InfiniteMap.tsx`：见 **31. 注释版：InfiniteMap.tsx**
- `editor/runtime.ts`：见 **32. 注释版：editor/runtime.ts**
- `editor/createDefaultEditorPlugins.ts`：见 **33. 注释版：默认插件集合**

