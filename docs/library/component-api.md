# 组件 API（InfiniteMap）

本页聚焦“怎么用”：列出接入时最常用的 props / apiRef 能力与典型用法。

> 更细的能力列表见：[全量功能清单与对外 API](/功能清单与对外API)

## 1）核心 Props

### nodes（必填）

```ts
nodes: NodeData[]
```

Infinite Map 本身不持有 nodes 状态；你传什么它渲染什么。

### plugins（可选）

```ts
plugins?: InfiniteMapPlugin[]
```

- 不传：只渲染（预览）
- 传入 editor 插件集合：启用 selection/drag/history/clipboard/HUD 等能力

### editMode / editable（推荐用 editMode）

```ts
editMode?: 'auto' | 'readonly' | 'controlled'
editable?: boolean
```

- `auto`：默认。若没有变更出口（`onNodesChange/onPatches` 都不传），编辑能力会自动关闭（表现为预览）。
- `readonly`：强制只读（编辑类 UI/手势/菜单等禁用）。
- `controlled`：受控编辑，要求提供 `onNodesChange` 或 `onPatches`。

### onNodesChange / onPatches（变更出口）

```ts
onNodesChange?: (nextNodes: NodeData[], meta: ChangeMeta) => void
onPatches?: (patches: NodePatch[], meta: ChangeMeta) => void
```

- `onNodesChange`：直接给你 nextNodes（简单）
- `onPatches`：给你差量 patches（适合协作/落库/审计；推荐）

### apiRef（宿主侧高频调用）

```ts
apiRef?: React.MutableRefObject<InfiniteMapApi | null>
```

## 2）渲染相关 Props

### renderNode / renderNodeContent

- `renderNode(node)`：完全自定义节点
- `renderNodeContent(node)`：推荐用法，只自定义内容区，外壳沿用默认 Node 样式（更省心）

### virtualization（虚拟化）

```ts
virtualization?: {
  enabled?: boolean
  overscanPx?: number
  keepAlive?: (node: NodeData) => boolean
}
```

适合大节点量场景；`keepAlive` 用于“重组件节点”避免频繁卸载/重建。

## 3）相机与视图

### initialCamera

```ts
initialCamera?: Camera
```

> 更常见的方式是用 `apiRef.getCamera()/setCamera()` 控制。

### 背景与缩放配置

- `backgroundMode?: 'dots' | 'grid'`
- `minZoom/maxZoom/zoomSpeed/pinchZoomFactor`
- `gridSpacing/dotSpacing` 支持 `'auto'`

## 4）主题

- `themeBase?: 'light' | 'dark'`
- `theme?: Partial<InfiniteMapTheme>`（只覆盖少量 CSS vars）

## 5）InfiniteMapApi（通过 apiRef 暴露）

### selection

```ts
api.getSelectionIds()
api.setSelectionIds(ids)
api.subscribe('selection:change', ({ ids }) => {})
```

### camera

```ts
api.getCamera()
api.setCamera(next, { immediate?: boolean })
api.subscribe('camera:change', (camera) => {})
```

### doc（保存/加载）

```ts
api.exportDoc(meta?)
api.importDoc(doc, { immediate?: boolean })
```

> 注意：`api.exportDoc()` 不会自动携带业务侧的 resources；resources 应由宿主自行拼装。见：[保存/加载](/library/persistence)。

### commands

```ts
api.runCommand?.('history.undo', { source: 'api' })
api.getCommands?.()
```

命令列表见：[命令速查表](/library/commands)。

