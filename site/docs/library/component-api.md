# 组件 API（InfiniteMap）

本页列出 `<InfiniteMap>` 所有 props 及其默认值和用法。

> 补充阅读：
> - [NodeData 字段参考](/infinite-map/library/node-data)
> - [插件配置](/infinite-map/library/plugin-config)
> - [InfiniteMapApi 参考](/infinite-map/library/api-ref)

## 核心 Props

### nodes（必填）

```ts
nodes: NodeData[]
```

InfiniteMap 本身不持有 nodes 状态；你传什么它渲染什么。

### plugins（可选）

```ts
plugins?: InfiniteMapPlugin[]
```

- 不传：只渲染（预览模式）
- 传入编辑器插件集合：启用 selection/drag/history/clipboard/HUD 等能力

推荐用 `createDefaultEditorPluginsWithUI()` 一键创建。

### editMode / editable（推荐用 editMode）

```ts
editMode?: 'auto' | 'readonly' | 'controlled'  // 默认 'auto'
editable?: boolean
```

- `auto`：默认。若没有变更出口（`onNodesChange` / `onPatches` 都不传），编辑能力自动关闭。
- `readonly`：强制只读（编辑 UI/手势/菜单禁用，pan/zoom 仍可用）。
- `controlled`：受控编辑，要求提供 `onNodesChange` 或 `onPatches`。

`editable` 是语法糖：`false`=readonly，`true`=controlled。

### onNodesChange / onPatches（变更出口）

```ts
onNodesChange?: (nextNodes: NodeData[], meta: ChangeMeta) => void
onPatches?: (patches: NodePatch[], meta: ChangeMeta) => void
```

- `onNodesChange`：直接给你 nextNodes（简单）
- `onPatches`：给你差量 patches（适合协作/落库/审计；推荐）

### apiRef

```ts
apiRef?: React.MutableRefObject<InfiniteMapApi | null>
```

暴露编辑器 API，用于程序化控制画布。详见 [InfiniteMapApi 参考](/infinite-map/library/api-ref)。

---

## 渲染相关

### 节点自定义

| Prop | 类型 | 说明 |
|---|---|---|
| `renderNode(node)` | `(node: NodeData) => ReactNode` | 完全自定义节点渲染 |
| `renderNodeContent(node)` | `(node: NodeData) => ReactNode` | 推荐：只自定义内容区，外壳沿用 DefaultNode |
| `getDefaultNodeProps(node)` | `(node: NodeData) => { className?, style? }` | 自定义节点容器的 className/style |
| `defaultNodeShowMeta` | `boolean`（默认 `false`） | 是否显示内置坐标信息（调试用） |
| `onNodeDrag` | `(id, pos, phase) => void` | 节点拖动回调（phase: `'move'` / `'end'`） |

### 虚拟化

```ts
virtualization?: {
  enabled?: boolean           // 默认 true
  overscanPx?: number         // 视口四周额外渲染 px
  keepAlive?: (node: NodeData) => boolean  // 防止"重组件节点"频繁卸载
  panKeepAlive?: boolean | { maxNodes?: number }  // pan 期间保持离场节点
}
```

适合大节点量场景。`keepAlive` 对图表/视频/富文本等重组件节点返回 `true`。

### 兼容旧字段

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `overscanPx` | `number` | `900` | 节点虚拟化 overscan（兼容旧字段，建议用 `virtualization.overscanPx`） |
| `cellSize` | `number` | `900` | 空间索引网格大小（世界单位） |

---

## 相机与视图

### initialCamera

```ts
initialCamera?: Camera  // 默认 { x: -400, y: -250, zoom: 1 }
```

更常见的方式是用 `apiRef.getCamera()/setCamera()` 控制。

### origin

```ts
origin?: 'center' | 'top-left'  // 默认 'center'
```

- `'center'`：世界原点在容器中心（默认，适合无限画布）
- `'top-left'`：世界原点在容器左上角（适合海报/固定布局，viewport resize 自动跟随）

```tsx
<InfiniteMap nodes={nodes} origin="top-left" panEnabled={false} />
```

### panEnabled

```ts
panEnabled?: boolean  // 默认 true
```

`false` 时禁止拖动平移画布（包括空白拖拽、Space 平移模式、触控板两指平移）。

### onReady

```ts
onReady?: (api: { getCamera, setCamera, moveOriginToTopLeft, getContainerTopLeft }) => void
```

地图首次就绪回调，viewport 取得有效尺寸后触发（仅一次）。不依赖 `plugins`，无插件时也可用。

```tsx
<InfiniteMap nodes={nodes} onReady={(api) => api.moveOriginToTopLeft()} />
```

### 缩放控制

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `minZoom` | `number` | `0.25` | 最小缩放倍率 |
| `maxZoom` | `number` | `2.5` | 最大缩放倍率 |
| `zoomSpeed` | `number` | `0.0012` | 滚轮缩放灵敏度（建议 0.001~0.002） |
| `pinchZoomFactor` | `number` | `0.6` | 触控板捏合缩放强度（>1 更敏感） |

---

## 背景与视觉

### 背景模式

```ts
backgroundMode?: 'dots' | 'grid' | 'none'  // 默认 'dots'
```

### 点阵背景

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `dotSpacing` | `number \| 'auto'` | `48` | 点阵间距（世界单位），`'auto'` 自适应 |
| `dotRadiusPx` | `number` | `1.35` | 点半径（屏幕像素） |
| `dotAlpha` | `number` | `0.18` | 点基础透明度 |

### 网格背景

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `gridSpacing` | `number \| 'auto'` | `'auto'` | 网格间距（世界单位） |
| `gridAlpha` | `number` | `0.14` | 网格线透明度 |

### 鼠标光晕

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `highlightRadiusPx` | `number` | `140` | 鼠标周围光晕半径（屏幕像素），设为 `0` 关闭 |
| `wheelPulseStrength` | `number` | `0.55` | 滚轮缩放时光晕脉冲强度 |

---

## 编辑器 Hooks

```ts
editorHooks?: {
  onBeforeCommand?: (id, info) => boolean | void
  onAfterCommand?: (id, info) => void
  onBeforeApplyPatches?: (patches, meta) => NodePatch[] | void
  onAfterApplyPatches?: (patches, meta) => void
}
```

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `hookMode` | `'observe' \| 'intercept'` | `'observe'` | `observe`：只观察；`intercept`：可阻止/覆盖 |
| `onEditorError` | `(err, info) => void` | — | 全局错误收集（避免单插件崩溃导致整树卸载） |

---

## 高级配置

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `commandConflictPolicy` | `'keep-first' \| 'override' \| 'error'` | `'keep-first'` | 多插件注册同名命令时的处理策略 |
| `warnOnCommandConflict` | `boolean` | `true` | 命令冲突时是否在 DEV 下打印警告 |
| `debug` | `boolean` | `false` | 调试模式（写入 debug:* store 键） |

---

## 主题

| Prop | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `themeBase` | `'light' \| 'dark'` | `'light'` | 基础主题 |
| `theme` | `Partial<InfiniteMapTheme>` | — | 覆盖部分颜色 token |

> 完整主题定制见：[主题定制](/infinite-map/library/theming)。

---

## InfiniteMapApi（通过 apiRef 暴露）

`apiRef` 提供程序化控制画布的能力。完整方法参考见 [InfiniteMapApi 参考](/infinite-map/library/api-ref)。

常用方法速览：

```ts
// 相机
api.getCamera()
api.setCamera({ x, y, zoom }, { immediate?: boolean })

// 选择
api.getSelectionIds()
api.setSelectionIds(ids)

// 命令
api.runCommand('history.undo', { source: 'api' })

// 历史
api.undo() / api.redo()
api.canUndo() / api.canRedo()  // boolean

// Doc
api.serializeDoc(meta?)
api.parseDoc(doc, { immediate?: boolean })

// 事件
api.subscribe('selection:change', ({ ids }) => {})
```
