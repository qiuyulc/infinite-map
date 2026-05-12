# InfiniteMapApi 参考

`InfiniteMapApi` 通过 `apiRef` 暴露给宿主，用于程序化控制画布。

## 获取引用

```tsx
import { useRef } from 'react'
import { InfiniteMap, type InfiniteMapApi } from '@qiuyulc/infinite-map'

function App() {
  const apiRef = useRef<InfiniteMapApi | null>(null)
  return <InfiniteMap nodes={nodes} apiRef={apiRef} />
}
```

## 相机（Camera）

### `getCamera()`

获取当前相机状态。

```ts
const cam = apiRef.current?.getCamera()
// { x: 100, y: 200, zoom: 1.5 }
```

### `setCamera(next, opts?)`

设置相机。

```ts
apiRef.current?.setCamera({ x: 0, y: 0, zoom: 1 }, { immediate: true })
```

- `immediate: true`：立即生效（不使用 rAF 合并）
- `immediate: false`（默认）：合并到下一帧

### `subscribeCamera(listener)`

订阅相机变化。

```ts
const unsub = apiRef.current?.subscribeCamera((cam) => {
  console.log('camera changed:', cam)
})
// 取消订阅：unsub()
```

---

## 选择（Selection）

### `getSelectionIds()`

获取当前选中的节点 id 列表。

```ts
const ids = apiRef.current?.getSelectionIds()
// ['node-1', 'node-3']
```

### `setSelectionIds(ids)`

设置选中的节点 id 列表。

```ts
apiRef.current?.setSelectionIds(['node-1', 'node-2'])
```

> 需要启用 selection 插件。

### `subscribeSelection(listener)`

订阅 selection 变化。

```ts
const unsub = apiRef.current?.subscribeSelection(() => {
  const ids = apiRef.current?.getSelectionIds()
  setDeleteEnabled((ids?.length ?? 0) > 0)
})
```

---

## 事件总线（EventBus）

### `subscribe(type, handler)`

订阅事件。支持的事件类型：

| 事件 | payload |
|---|---|
| `'camera:changed'` | `{ camera: Camera }` |
| `'selection:change'` | `{ ids: string[] }` |
| `'history:undo'` | `{ source: 'keyboard' \| 'toolbar' \| 'menu' \| 'api' }` |
| `'history:redo'` | `{ source }` |
| `'drag:start'` | `{ id, startWorld }` |
| `'drag:move'` | `{ id, rawWorld }` |
| `'drag:end'` | `{ id, endWorld }` |
| `'patches:applied'` | `{ patches, meta, beforeById }` |

```ts
const unsub = apiRef.current?.subscribe('selection:change', ({ ids }) => {
  console.log('selection changed:', ids)
})
```

---

## 命令（Commands）

### `runCommand(id, payload?)`

执行一个命令。

```ts
apiRef.current?.runCommand('history.undo', { source: 'api' })
apiRef.current?.runCommand('view.zoomIn', { source: 'api' })
apiRef.current?.runCommand('edit.delete', { source: 'api' })
```

### `getCommands()`

获取所有已注册的命令列表。

```ts
const commands = apiRef.current?.getCommands()
// [{ id: 'history.undo', title: '撤销', shortcut: 'Mod+Z' }, ...]
```

### `getCommand(id)`

获取单个命令详情。

```ts
const cmd = apiRef.current?.getCommand('history.undo')
// { id: 'history.undo', title: '撤销', shortcut: 'Mod+Z', run: [Function] }
```

> 完整命令列表见：[命令速查表](/library/commands)

---

## 历史（History）

### `undo()` / `redo()`

撤销/重做。

```ts
apiRef.current?.undo()
apiRef.current?.redo()
```

### `canUndo()` / `canRedo()`

检查是否可以撤销/重做（用于控制 UI 按钮状态）。

```ts
const canUndo = apiRef.current?.canUndo() ?? false
const canRedo = apiRef.current?.canRedo() ?? false
```

### `subscribeHistory(listener)`

订阅历史状态变化。

```ts
const unsub = apiRef.current?.subscribeHistory(() => {
  // 更新工具栏按钮状态
})
```

---

## 节点查询

### `getNodes()`

获取当前节点列表（只读快照）。

```ts
const nodes = apiRef.current?.getNodes()
```

### `getNodeRect(id)`

获取某个节点的包围盒（世界坐标）。

```ts
const rect = apiRef.current?.getNodeRect('node-1')
// { x: 100, y: 200, w: 150, h: 80 } | null
```

### `getSelectionRect()`

获取当前选中的节点集合的包围盒。

```ts
const rect = apiRef.current?.getSelectionRect()
// null if no selection
```

---

## Doc 导入导出

### `serializeDoc(meta?)`

把当前画布序列化为 doc 对象。

```ts
const doc = apiRef.current?.serializeDoc({ name: 'my-file' })
// { schemaVersion: 1, nodes: [...], camera: {...}, resources: {}, meta: { name: 'my-file' } }
```

> 注意：不会自动携带业务侧的 `resources`，需要宿主自行拼装。

### `parseDoc(doc, opts?)`

解析 doc 并应用到画布。

```ts
const raw = localStorage.getItem('my-doc')
if (raw) {
  apiRef.current?.parseDoc(JSON.parse(raw), { immediate: true })
}
```

- `immediate: true`：相机立即更新（不使用 rAF 合并）

---

## 典型场景

### 工具栏按钮

```tsx
function UndoButton({ apiRef }: { apiRef: React.RefObject<InfiniteMapApi | null> }) {
  const [, bump] = useState(0)
  useEffect(() => {
    return apiRef.current?.subscribeHistory(() => bump((x) => x + 1))
  }, [apiRef])

  return (
    <button
      disabled={!apiRef.current?.canUndo()}
      onClick={() => apiRef.current?.undo()}
    >
      撤销
    </button>
  )
}
```

### 外部缩放控制

```tsx
function ZoomControls({ apiRef }: { apiRef: React.RefObject<InfiniteMapApi | null> }) {
  return (
    <div>
      <button onClick={() => apiRef.current?.runCommand('view.zoomIn', { source: 'api' })}>+</button>
      <button onClick={() => apiRef.current?.runCommand('view.zoomOut', { source: 'api' })}>-</button>
      <button onClick={() => apiRef.current?.runCommand('view.fitView', { source: 'api' })}>Fit</button>
    </div>
  )
}
```

### 保存/加载

```tsx
function SaveLoadButtons({ apiRef }: { apiRef: React.RefObject<InfiniteMapApi | null> }) {
  const handleSave = () => {
    const doc = apiRef.current?.serializeDoc()
    if (doc) localStorage.setItem('my-doc', JSON.stringify(doc))
  }

  const handleLoad = () => {
    const raw = localStorage.getItem('my-doc')
    if (raw) apiRef.current?.parseDoc(JSON.parse(raw), { immediate: true })
  }

  return (
    <div>
      <button onClick={handleSave}>保存</button>
      <button onClick={handleLoad}>加载</button>
    </div>
  )
}
```
