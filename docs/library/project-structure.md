# 项目目录结构与职责

本仓库是一个 monorepo，核心由两个包组成：

- `@qiuyulc/infinite-map`：画布内核（渲染 + editor runtime + contract types）
- `@qiuyulc/infinite-map-editor`：默认编辑器插件与 UI（selection/drag/resize/history/toolbar/...）

同时提供：
- `playground/`：本地验证与回归面板
- `docs/`：VitePress 文档站

---

## 1）仓库根目录（monorepo）

```
.
├─ packages/
│  ├─ infinite-map/          # 内核包
│  └─ infinite-map-editor/   # 编辑器插件 + UI 包
├─ playground/               # 本地测试面板（用于回归）
├─ docs/                     # 文档站（VitePress）
├─ scripts/                  # 校验/构建脚本（如 verify-exports）
└─ package.json              # workspace scripts + 统一依赖
```

---

## 2）packages/infinite-map（内核包）

定位：**只负责“画布能力本身”**，不强绑定任何业务侧存储/协作/服务端，也不强绑定 UI 形态。

```
packages/infinite-map/
└─ src/
   ├─ components/
   │  ├─ InfiniteMap.tsx           # 入口组件：容器 + runtime 组装 + overlays 渲染
   │  ├─ RenderDomNodes.tsx        # DOM 节点渲染（可自定义 renderNode/renderNodeContent）
   │  └─ BackgroundGrid/Dots.tsx   # 背景渲染
   ├─ core/
   │  ├─ types.ts                  # NodeData/Camera/Rect 等基础类型与几何工具
   │  ├─ spatialIndex.ts           # 空间索引（命中/可见性加速）
   │  └─ utils.ts                  # clamp/cssVar 等基础工具
   ├─ editor/
   │  ├─ types.ts                  # 插件协议（MapContext/Command/Gesture/事件总线类型等）
   │  ├─ runtime.ts                # store/bus + patches 引擎（applyPatchesToNodes 等）
   │  ├─ keys.ts                   # STORE_KEYS（运行时状态 key）
   │  └─ document.ts               # doc 快照：serializeDoc/parseDoc + schemaVersion 校验
   ├─ hooks/
   │  ├─ usePluginInputDispatch.ts # 输入管线（hitTest → pointerDownProcessors → gestures）
   │  ├─ useRunCommandWithHooks.ts # command 运行 + hooks
   │  ├─ useAttachApiRef.ts        # apiRef 实现（camera/commands/doc/selection 等）
   │  └─ ...                       # camera/viewport/virtualization/wheel 等 hooks
   ├─ layout/
   │  └─ layoutPresets.ts          # 布局算法（纯计算）
   ├─ theme/                       # 主题相关（CSS vars / theme types）
   ├─ ui/                          # 内核自带的轻量 UI（ThemeProvider 等）
   ├─ demo/                        # demo 节点/示例数据（仅建议文档/Playground 使用）
   └─ index.ts                     # 包入口导出
```

你可以把它理解为「React 画布 + 一套可插拔的 editor runtime」。

---

## 3）packages/infinite-map-editor（默认编辑器插件 + UI 包）

定位：提供一套“开箱即用”的编辑体验：选择、拖拽、缩放、历史、右键菜单、工具栏、对齐分布等。

```
packages/infinite-map-editor/
└─ src/
   ├─ editor/
   │  ├─ composePlugins.ts               # 插件依赖校验 + 拓扑排序 + 装配
   │  ├─ createDefaultEditorPlugins.ts   # 默认插件集合（不含 UI）
   │  ├─ createDefaultEditorPluginsWithUI.ts # 默认插件集合（含 UI overlays）
   │  ├─ groupUtils.ts                   # group/parentId 相关工具（buildById/isLockedEffective 等）
   │  └─ snapUtils.ts                    # 对齐吸附计算工具
   ├─ plugins/
   │  ├─ createSelectionPlugin.ts        # 选择服务（selection service）
   │  ├─ createDragPlugin.ts             # 拖拽移动（move patches）
   │  ├─ createResizePlugin.ts           # resize handles + 缩放 patches
   │  ├─ createHistoryPlugin.ts          # undo/redo + history stacks
   │  ├─ createShortcutsPlugin.ts        # 命令快捷键映射（Mod+C 等）
   │  ├─ createDefaultContextMenuPlugin.tsx # 默认右键菜单 UI
   │  ├─ createToolbarPlugin.tsx         # 默认工具栏 UI
   │  ├─ createAlignDistributePlugin.ts  # 对齐/分布
   │  ├─ createNudgePlugin.ts            # 键盘方向键微调
   │  └─ ...                             # minimap/rulers/zoomDock/rotate/lockHide/exportPng...
   ├─ components/
   │  └─ Slider.tsx                      # UI 组件
   └─ __tests__/                          # 插件交互回归测试（vitest + jsdom）
```

核心关系：
- **内核包**定义“协议与运行时”（types/runtime/hooks）
- **editor 包**实现“具体插件与 UI overlays”，并通过 `composePlugins()` 装配到 `<InfiniteMap />`
