# 快速上手

本页是“业务接入”的最短路径：把 Infinite Map 跑起来，并理解在三方库场景下你需要接哪几个口。

## 安装

```bash
pnpm add @qiuyulc/infinite-map @qiuyulc/infinite-map-editor
```

## 1）纯预览（只渲染，不启用编辑器插件）

```tsx
import { useState } from 'react';
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';

export function App() {
  const [nodes] = useState<NodeData[]>([]);
  return <InfiniteMap nodes={nodes} />;
}
```

## 2）启用默认编辑器（受控）

当你启用编辑器插件（selection/drag/history…）时，**宿主必须提供变更出口**，否则编辑行为不会落地。

```tsx
import { useMemo, useState } from 'react';
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map';
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor';

export function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const plugins = useMemo(() => createDefaultEditorPluginsWithUI(), []);

  return (
    <InfiniteMap
      nodes={nodes}
      plugins={plugins}
      editMode="controlled"
      onNodesChange={(next) => setNodes(next)}
    />
  );
}
```

## 3）用 onPatches 接入（推荐：协作/落库/审计）

`onPatches` 输出的是“差量变更”，业务侧可以选择：
- 本地 apply（让 UI 立即生效）
- 同时把 patches 发给后端（协作/持久化）

```tsx
import { useMemo, useState } from 'react';
import { InfiniteMap, applyPatchesToNodes, type ChangeMeta, type NodeData, type NodePatch } from '@qiuyulc/infinite-map';
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor';

export function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const plugins = useMemo(() => createDefaultEditorPluginsWithUI(), []);

  const onPatches = (patches: NodePatch[], _meta: ChangeMeta) => {
    setNodes((prev) => applyPatchesToNodes(prev, patches));
    // 同时把 patches 发给后端：send({ patches, meta })
  };

  return <InfiniteMap nodes={nodes} plugins={plugins} editMode="controlled" onPatches={onPatches} />;
}
```

## 4）编辑模式（editMode / editable）

- `editMode="auto"`（默认，向后兼容）：没有变更出口时，编辑能力会被关闭（表现为预览）。
- `editMode="readonly"`：强制只读（编辑类 UI/手势会禁用）。
- `editMode="controlled"`：受控编辑，要求提供 `onNodesChange` 或 `onPatches`。

`editable` 是语法糖：
- `editable={false}` 等价于 `editMode="readonly"`
- `editable={true}` 等价于 `editMode="controlled"`

## 下一步

- [组件 API](/docs/library/component-api)
- [编辑与变更流（onPatches）](/docs/library/editing)
- [Demo 与本地测试面板](/docs/library/demos)

