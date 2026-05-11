# 编辑器快速上手

本文带你 5 分钟接入 Infinite Map 编辑器。

---

## 安装

```bash
pnpm add @qiuyulc/infinite-map @qiuyulc/infinite-map-editor
```

两个包必须同时安装：`@qiuyulc/infinite-map` 是画布内核，`@qiuyulc/infinite-map-editor` 是编辑器插件集合。

---

## 纯预览（只渲染，不启用编辑器）

如果只需要渲染节点，不需要任何编辑交互：

```tsx
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';

const nodes: NodeData[] = [
  { id: '1', x: 100, y: 100, width: 200, height: 120, label: 'Hello' },
];

<InfiniteMap nodes={nodes} />
```

此时可以 pan/zoom 浏览，但没有任何编辑能力。

---

## 启用完整编辑器

```tsx
import { useState } from 'react';
import { InfiniteMap } from '@qiuyulc/infinite-map';
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor';
import type { NodeData } from '@qiuyulc/infinite-map';

export default function App() {
  const [nodes, setNodes] = useState<NodeData[]>([
    { id: '1', x: 100, y: 100, width: 200, height: 120, label: 'Hello' },
    { id: '2', x: 400, y: 200, width: 200, height: 120, label: 'World' },
  ]);

  const plugins = createDefaultEditorPluginsWithUI({
    toolbar: { enabled: true },
    contextMenu: { enabled: true },
  });

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <InfiniteMap
        nodes={nodes}
        plugins={plugins}
        onNodesChange={setNodes}
      />
    </div>
  );
}
```

开局即获得：拖拽移动、8点缩放、旋转、框选、Undo/Redo、剪贴板、标尺、小地图、吸附对齐。

---

## 纯编辑能力（无 UI）

如果不需要工具栏/右键菜单/小地图等 HUD，只想要纯编辑手势：

```tsx
import { createDefaultEditorPlugins } from '@qiuyulc/infinite-map-editor';

const plugins = createDefaultEditorPlugins({
  snap: { enabled: true },
  marquee: { enabled: true, requireShift: false },
});
```

包含：选择/拖拽/缩放/旋转/框选/Undo/Redo/剪贴板/对齐吸附。**不含任何 UI overlay**。

---

## 编辑模式

- `editMode="auto"`（默认）：未提供变更出口时自动退化为只读
- `editMode="readonly"`：强制只读，所有编辑手势和 UI 禁用
- `editMode="controlled"`：受控编辑，要求提供 `onNodesChange` 或 `onPatches`

`editable` 是语法糖：`editable={false}` ≡ `editMode="readonly"`，`editable={true}` ≡ `editMode="controlled"`。

---

## 处理变更：onPatches vs onNodesChange

编辑器不直接修改你的 `nodes` 数组：

### onNodesChange（简单）

```tsx
<InfiniteMap nodes={nodes} onNodesChange={setNodes} plugins={plugins} />
```

每次编辑产生完整的新 nodes 数组。

### onPatches（推荐）

```tsx
import { applyPatchesToNodes } from '@qiuyulc/infinite-map';

<InfiniteMap
  nodes={nodes}
  plugins={plugins}
  onPatches={(patches) => {
    setNodes(prev => applyPatchesToNodes(prev, patches));
  }}
/>
```

`onPatches` 输出细粒度差量变更（`NodePatch[]`），适合高频编辑和多人协作。详见 [编辑与变更流](/infinite-map-editor/editing)。

---

## 常用配置

```tsx
const plugins = createDefaultEditorPluginsWithUI({
  // HUD 开关
  rulers:       { enabled: true, thickness: 24 },
  minimap:      { enabled: true, width: 260, height: 160 },
  zoomDock:     { enabled: true },
  toolbar:      { enabled: true },
  contextMenu:  { enabled: true },

  // 编辑行为
  marquee:      { enabled: true, requireShift: false },
  snap:         { enabled: true, guidesEnabled: true },
  clipboard:    { enabled: true },

  // 快捷键覆盖
  shortcuts: {
    commandShortcuts: {
      'history.undo': 'Mod+Z',
      'edit.delete': null,
    },
  },

  // 视图
  view: { paddingPx: 48, zoomStep: 1.2, minZoom: 0.25, maxZoom: 2.5 },
  history: { limit: 200 },
});
```

全部配置项见 [插件配置](/infinite-map-editor/plugin-config)。

---

## 按需组合插件

不想用默认组装的话，可以手动挑选：

```tsx
import { composePlugins, EditorPlugins } from '@qiuyulc/infinite-map-editor';

const plugins = composePlugins([
  EditorPlugins.createKeyboardStatePlugin(),
  EditorPlugins.createCoreServicesPlugin(),
  EditorPlugins.createCommandRunnerPlugin(),
  EditorPlugins.createHistoryPlugin(),
  EditorPlugins.createSelectionPlugin(),
  EditorPlugins.createDragPlugin(),
  EditorPlugins.createResizePlugin(),
  EditorPlugins.createMarqueeSelectPlugin(),
]);
```

`composePlugins()` 自动校验依赖、解决冲突、按优先级排序。详见 [插件开发指南](/infinite-map-editor/plugin-development)。

---

## 下一步

- [插件配置](/infinite-map-editor/plugin-config) — 所有可配置项和默认值
- [操作与快捷键](/infinite-map-editor/shortcuts-and-operations) — 完整交互指南
- [编辑与变更流](/infinite-map-editor/editing) — 深入理解 patches 机制
- [插件开发指南](/infinite-map-editor/plugin-development) — 编写自定义插件
- [编辑器定制](/infinite-map-editor/customization) — 定制工具栏/右键菜单/HUD
