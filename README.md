# Infinite Map

一个 React 的无限画布/编辑器内核（`@qiuyulc/infinite-map`）+ 默认编辑器插件与 UI kit（`@qiuyulc/infinite-map-editor`）。

> 使用手册见 `docs/`（VitePress）。

## 包说明

- `@qiuyulc/infinite-map`
  - `<InfiniteMap />`：渲染层 + 编辑器运行时（store/bus/patches）
  - 插件输入管线（Scheme C）：`hitTest → pointerDownProcessors → gestures`
  - Doc 持久化：`exportDoc/importDoc`（含 schemaVersion + migrations）
- `@qiuyulc/infinite-map-editor`
  - 内置插件工厂：selection/drag/resize/rotate/marquee/history/minimap/toolbar/…
  - `composePlugins()`：依赖校验 + 拓扑排序

## 本地开发

```bash
pnpm install

# 启动 playground
pnpm -C playground dev

# 启动文档站
pnpm -C docs dev
```

## 最小用法（纯渲染）

```tsx
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map'

const nodes: NodeData[] = [
  { id: 'a', x: 0, y: 0, width: 120, height: 60, label: 'A' },
]

export function App() {
  // 纯预览不需要变更出口
  return <InfiniteMap nodes={nodes} />
}
```

## 启用编辑器（插件 + UI）

```tsx
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map'
import { createDefaultEditorPluginsWithUI } from '@qiuyulc/infinite-map-editor'

export function EditorApp() {
  const [nodes, setNodes] = useState<NodeData[]>([])
  const plugins = useMemo(() => createDefaultEditorPluginsWithUI(), [])

  return (
    <InfiniteMap
      nodes={nodes}
      plugins={plugins}
      editMode="controlled"
      onNodesChange={(next) => setNodes(next)}
    />
  )
}
```

> 注意：启用 plugins 且希望编辑生效时，需要提供 `onNodesChange` 或 `onPatches` 作为变更出口；否则会退化为预览（编辑 UI/交互会被禁用）。

## 保存/加载（Doc schema）

推荐通过 `apiRef`：

```tsx
const apiRef = useRef<InfiniteMapApi | null>(null)

// 保存
const doc = apiRef.current?.exportDoc()
localStorage.setItem('doc', JSON.stringify(doc))

// 加载
const raw = localStorage.getItem('doc')
if (raw) apiRef.current?.importDoc(JSON.parse(raw), { immediate: true })
```

`importDoc` 会自动处理：
- legacy v0（无 schemaVersion）
- v1 → v2 迁移（新增 resources 字段）

## 文档（VitePress）

推荐阅读路径：
- `docs/library/quickstart.md`（快速上手）
- `docs/library/component-api.md`（组件 API）
- `docs/library/editing.md`（编辑与变更流：onPatches）
- `docs/library/view.md`（视图控制：铺满/居中/锁定）
- `docs/library/persistence.md`（保存/加载：Doc & Resources）
- `docs/library/collaboration.md`（多人协作接入）
- `docs/library/commands.md`（命令/快捷键速查）

本地启动：

```bash
pnpm -C docs dev
```
