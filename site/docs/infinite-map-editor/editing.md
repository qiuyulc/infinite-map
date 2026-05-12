# 编辑与变更流（onPatches）

Infinite Map 的编辑器插件不会直接修改你的数据源，而是产生 **patches（差量变更）**。宿主决定这些变更怎么落地（本地、后端、协作）。

---

## onNodesChange vs onPatches

- `onNodesChange(nextNodes)`：简单直接，每次都是完整数组。适合小型场景。
- `onPatches(patches)`：细粒度差量变更，更适合高频编辑与多人协作（推荐）。

```ts
import { applyPatchesToNodes } from '@qiuyulc/infinite-map'

setNodes(prev => applyPatchesToNodes(prev, patches))
```

---

## NodePatch 类型

`NodePatch[]` 表示一次编辑操作产生的一组变更：

```ts
type NodePatch =
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'set'; id: string; data: Partial<NodeData> }
  | { type: 'add'; node: NodeData }
  | { type: 'remove'; id: string }
```

每条 patch 伴随 `ChangeMeta` 描述来源：

```ts
type ChangeMeta = {
  source: 'plugin';
  plugin: string;
  reason: 'drag' | 'click-select' | 'marquee-select' | 'snap' | 'align'
        | 'distribute' | 'keyboard' | 'delete' | 'copy' | 'cut' | 'paste'
        | 'duplicate' | 'import' | 'undo' | 'redo' | 'group' | 'ungroup'
        | 'group-sync';
  phase?: 'start' | 'move' | 'end';
  ids?: string[];
}
```

- `meta.source`：变更来源（目前统一为 `'plugin'`）
- `meta.phase`：`'start' | 'move' | 'end'`，用于 drag/resize/rotate 的阶段合并
- `meta.ids`：涉及的节点 id 列表

---

## 只读/预览模式

当满足以下任一条件时，编辑器自动退化为"预览/只读"（不会出现选中框、缩放点、对齐线、右键菜单、工具栏、框选等编辑 UI）：

- `editMode="readonly"` 或 `editable={false}`
- `editMode="auto"`（默认）且 **未提供变更出口**（`onNodesChange/onPatches` 都不传）

```tsx
<InfiniteMap nodes={nodes} plugins={plugins} editMode="readonly" />
```

---

## 错误收集（可选）

宿主可传 `onEditorError(err, info)` 收集插件/命令/overlay 的错误，避免单个插件渲染错误导致整棵树崩溃：

```tsx
<InfiniteMap
  nodes={nodes}
  plugins={plugins}
  onEditorError={(err, info) => {
    console.error(`[${info.pluginId}] ${info.kind}:${info.name}`, err);
  }}
/>
```

---

## 下一步

- [操作与快捷键](/infinite-map-editor/shortcuts-and-operations) — 完整交互指南
- [插件 API 参考](/infinite-map-editor/plugin-reference) — 所有内置插件详解
- [多人协作接入](/library/collaboration) — patches 在协作场景的应用
