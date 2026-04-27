# 编辑与变更流（onPatches）

Infinite Map 的编辑器插件不会直接“改你的数据源”，而是产生 **patches（差量变更）**。宿主决定这些变更怎么落地（本地、后端、协作）。

## 1）onNodesChange vs onPatches

- `onNodesChange(nextNodes)`：简单直接，但每次都是完整数组
- `onPatches(patches)`：更适合高频编辑与多人协作（推荐）

通常的做法是：在 `onPatches` 里用纯函数把 patches 应用到 nodes。

```ts
import { applyPatchesToNodes } from '@qiuyulc/infinite-map'

setNodes(prev => applyPatchesToNodes(prev, patches))
```

## 2）什么是 NodePatch

`NodePatch[]` 表示一次编辑操作产生的一组变更（move/set/add/remove 等），并伴随 `ChangeMeta` 描述来源：

- `meta.source`：`'plugin' | 'keyboard' | 'toolbar' | 'menu' | 'api' | ...`
- `meta.phase`：`'start' | 'move' | 'end'`（用于 drag/resize/rotate 的阶段合并）
- `meta.ids`：这次变更涉及的节点 id

## 3）只读/预览模式为什么会“禁用编辑 UI”

当满足以下任一条件时，运行时会认为**没有编辑能力**（`editEnabled=false`）：
- `editMode="readonly"`
- 或者 `editMode="auto"` 且 **没有变更出口**（`onNodesChange/onPatches` 都不传）

此时会统一禁用编辑器相关交互与 UI（例如：selection overlay、框选、右键菜单、工具栏、对齐线、drag/resize 等）。

## 4）如何做“预览但可浏览”

只读通常仍允许 pan/zoom（浏览视图），你只需要：

```tsx
<InfiniteMap nodes={nodes} plugins={plugins} editMode="readonly" />
```

## 5）错误收集（可选）

宿主可传 `onEditorError(err, info)` 收集插件/命令/overlay 的错误，避免单个插件渲染错误导致整棵树崩溃。

