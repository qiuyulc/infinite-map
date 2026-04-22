# 03. Editor：编辑能力从哪里来（plugins）

这一章解决你最困惑的点：

> 为什么代码看起来很分散？因为“每个功能是一个插件”，不是全写在一个大文件里。

对应文件：

- `packages/infinite-map/src/editor/createDefaultEditorPlugins.ts`

---

## 先看最终结论：默认编辑器 = 一串插件组合

打开 `createDefaultEditorPlugins.ts`，你会看到大概是这样：

```ts
const plugins: InfiniteMapPlugin[] = [
  createKeyboardStatePlugin(),
  createCoreServicesPlugin(),
  createCommandRunnerPlugin(),
  createShortcutsPlugin(),
  createHistoryPlugin(),
  createViewCommandsPlugin(),
  createZIndexPlugin(),
  createSnapGuidesPlugin(),
  createRotate3DPlugin(),
  createSelectionPlugin(),
  createClipboardPlugin(),
  createRotatePlugin(),
  createResizePlugin(),
  createDragPlugin(),
  // 下面是可选 HUD
  createToolbarPlugin(),
  createZoomDockPlugin(),
  createDefaultContextMenuPlugin(),
  createRulersPlugin(),
  createMinimapPlugin(),
];
```

你不需要立刻懂每个插件做什么，你只需要知道：

1) **插件顺序很重要**（影响谁先处理鼠标事件）
2) **可选 UI 也是插件**（toolbar/minimap/右键/zoomDock）

---

## “我点了一下鼠标”会发生什么？（超简单版）

以“拖拽移动节点”为例：

```txt
你按下鼠标并拖动
  → drag 插件捕获 pointermove
  → 它计算新位置（x/y）
  → 它调用 onNodesChange（或 applyPatches）
  → React 重新渲染节点
```

对应文件：

- `transform/createDragPlugin.ts`

---

## 插件都放在哪？

源码目录：

`packages/infinite-map/src/editor/plugins/`

按领域分类：

- `core/`：基础能力（命令、快捷键、history、camera service、zIndex…）
- `selection/`：选中、框选、选框 UI
- `transform/`：拖拽、缩放、旋转
- `snapping/`：吸附、辅助线
- `clipboard/`：复制/粘贴
- `hud/`：UI（toolbar/minimap/rulers/contextmenu/zoomDock）

---

## 你现在最应该学会的：怎么定位“一个功能”在哪

给你一个“对照表”（你可以直接点开这些文件）：

### 缩放相关

- 滚轮缩放：`hooks/useWheelControls.ts`
- 放大/缩小/重置缩放命令：`editor/plugins/core/createViewCommandsPlugin.ts`
- 右下角缩放条：`editor/plugins/hud/createZoomDockPlugin.tsx`

### 右键菜单

- 菜单的开关与坐标：`editor/plugins/hud/createContextMenuPlugin.ts`
- 默认菜单 UI：`editor/plugins/hud/createDefaultContextMenuPlugin.tsx`

### minimap

- HUD overlay：`editor/plugins/hud/MinimapOverlay.tsx`
- 具体绘制：`components/Minimap.tsx`

---

下一章我们会真的动手写一个“最简单插件”（不需要懂架构术语）。

