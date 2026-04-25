# API 总览（作为三方库使用）

这页给“接入方/业务方”一个最短路径：如何把 Infinite Map 当成稳定三方库来接入、保存、扩展。

更全的清单请看：
- [功能清单与对外 API（全量）](/功能清单与对外API)

---

## 1）你会用到的两个包

- `@qiuyulc/infinite-map`：核心 `<InfiniteMap />` + plugin contract + Doc schema
- `@qiuyulc/infinite-map-editor`：默认编辑器插件集合（selection/drag/history/…）+ HUD（minimap/rulers/…）

---

## 2）最小接入（受控 nodes）

```tsx
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map'

export function App() {
  const [nodes, setNodes] = useState<NodeData[]>([])
  return <InfiniteMap nodes={nodes} onNodesChange={setNodes} />
}
```

如果你传了 `plugins`，就一定要提供 `onNodesChange` 或 `onPatches`，否则编辑看起来会“无效”（开发环境会 warn）。

---

## 3）启用默认编辑器能力（插件集合）

```tsx
import { InfiniteMap } from '@qiuyulc/infinite-map'
import { createDefaultEditorPlugins } from '@qiuyulc/infinite-map-editor'

const plugins = createDefaultEditorPlugins()

<InfiniteMap nodes={nodes} onNodesChange={setNodes} plugins={plugins} />
```

---

## 4）apiRef（宿主侧高频调用）

```tsx
import type { InfiniteMapApi } from '@qiuyulc/infinite-map'

const apiRef = useRef<InfiniteMapApi | null>(null)

// 订阅事件
useEffect(() => apiRef.current?.subscribe('selection:change', ({ ids }) => console.log(ids)), [])

// selection
apiRef.current?.getSelectionIds()
apiRef.current?.setSelectionIds(['a','b'])

// bbox（世界坐标）
apiRef.current?.getNodeRect('a')
apiRef.current?.getSelectionRect()
```

---

## 5）保存/加载（Doc schema）

推荐用 `apiRef.exportDoc()` / `apiRef.importDoc()`：

```ts
const doc = apiRef.current?.exportDoc()
localStorage.setItem('doc', JSON.stringify(doc))

const raw = localStorage.getItem('doc')
if (raw) apiRef.current?.importDoc(JSON.parse(raw), { immediate: true })
```

- `importDoc` 会自动处理 legacy v0（无 schemaVersion）与 v1→v2 迁移
- Doc schema 说明见：[Doc schema 与迁移](/library/doc-schema)

---

## 6）命令（commands）

默认编辑器提供大量命令（undo/redo、group、zIndex、align/distribute…）。

宿主可以触发：

```ts
apiRef.current?.runCommand?.('history.undo', { source: 'api' })
```

---

## 7）导出 PNG（当前为骨架）

editor 提供 `file.exportPng` 命令（骨架），触发事件：
- `export:png`

宿主监听该事件并自行实现 DOM/canvas 截图即可（避免库强绑某个截图实现）。

