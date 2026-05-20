# NodeData — 节点数据参考

`NodeData` 是 InfiniteMap 的核心数据结构，每个画布上的节点都是一个 `NodeData` 对象。

## 类型定义

```ts
type NodeData = {
  id: string
  x: number
  y: number
  width: number
  height: number
  z?: number
  rotation?: number
  rotationX?: number
  rotationY?: number
  label?: string
  color?: string
  kind?: 'node' | 'group'
  parentId?: string
  resourceId?: string
  locked?: boolean
  hidden?: boolean
  data?: unknown
}
```

## 字段说明

### 必填

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 全局唯一标识。用于编辑操作（move/delete）、虚拟化 key 等 |
| `x` | `number` | 世界坐标 X（节点左上角） |
| `y` | `number` | 世界坐标 Y（节点左上角） |
| `width` | `number` | 节点宽度（世界单位） |
| `height` | `number` | 节点高度（世界单位） |

### 层级与旋转

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `z` | `number` | `0` | 层级，越大越靠上。影响渲染顺序和命中测试 |
| `rotation` | `number` | `0` | 2D 旋转角度（度数，顺时针） |
| `rotationX` | `number` | `0` | 3D 旋转：绕 X 轴（deg），通过 `Alt/Option + 拖拽` 控制 |
| `rotationY` | `number` | `0` | 3D 旋转：绕 Y 轴（deg），通过 `Alt/Option + 拖拽` 控制 |

### 显示

| 字段 | 类型 | 说明 |
|---|---|---|
| `label` | `string` | 节点标题。使用默认 `DefaultNode` 渲染时会显示在节点顶部 |
| `color` | `string` | 节点颜色。使用默认 `DefaultNode` 渲染时作为顶部色条 |

### 编组（Group）

| 字段 | 类型 | 说明 |
|---|---|---|
| `kind` | `'node' \| 'group'` | 节点种类。`'group'` 表示这是一个编组节点，用于组织结构 |
| `parentId` | `string` | 父组 id。当节点被编入某个 group 时存在，形成树形结构 |

> `kind='group'` 的节点不建议放业务数据，它会自动跟随成员节点的包围盒。拖拽 group 会带动所有后代，缩放 group 会缩放后代。

### 数据存储建议

| 字段 | 类型 | 说明 |
|---|---|---|
| `resourceId` | `string` | 外置数据引用 id。建议把"大业务数据"（图表/富文本/大数组）放到外部 store，node 里只放引用 |
| `data` | `unknown` | 业务自定义数据。**不推荐放超大对象**，小字段（几个 key-value）可以放这里 |

### 编辑器状态

| 字段 | 类型 | 说明 |
|---|---|---|
| `locked` | `boolean` | 锁定。锁定后可被选中（方便解锁），但不可拖拽/缩放/旋转/框选。**锁定传递**：祖先 locked → 后代视为 locked |
| `hidden` | `boolean` | 隐藏。`true` 时不渲染、不参与命中/选择/虚拟化。**隐藏传递**：祖先 hidden → 后代视为 hidden |

## 最小示例

```ts
const nodes: NodeData[] = [
  { id: '1', x: -160, y: -40, width: 150, height: 80, label: 'Hello' },
  { id: '2', x: 10, y: -40, width: 150, height: 80, label: 'World' },
]
```

## 带编组的示例

```ts
const nodes: NodeData[] = [
  { id: 'group-1', x: -150, y: -100, width: 300, height: 200, kind: 'group', label: 'Group 1' },
  { id: 'a', x: -140, y: -90, width: 100, height: 60, parentId: 'group-1', label: 'Child A' },
  { id: 'b', x: 0, y: -90, width: 100, height: 60, parentId: 'group-1', label: 'Child B' },
]
```

## 带外置数据的示例

```ts
// 外部 store（Zustand / Jotai / your own）
const chartDataStore = {
  'chart-1': { series: [...], options: {...} },
}

// NodeData 只放引用
const nodes: NodeData[] = [
  { id: 'chart-1', x: -200, y: -150, width: 400, height: 300, resourceId: 'chart-1' },
]

// 渲染时从外部 store 读取
function renderNodeContent(node: NodeData) {
  const rid = node.resourceId ?? node.id
  const data = chartDataStore[rid]
  return <Chart data={data} />
}
```