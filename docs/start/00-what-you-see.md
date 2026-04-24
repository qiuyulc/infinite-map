# 00. 你在页面上看到了什么？

我们从 **playground 的页面**开始，因为它是“运行中的例子”，最直观。

打开这个文件：

- `playground/src/App.tsx`

你会看到页面大概长这样（文字图）：

```txt
┌───────────────┬──────────────────────────────────────┐
│ 左侧：测试面板 │ 右侧：InfiniteMap 画布               │
│ - 主题/背景    │ - 背景（网格/点阵）                  │
│ - 标尺         │ - 一堆节点（方块卡片）               │
│ - Minimap      │ - 选中框/吸附线/右键菜单/工具栏等 UI │
│ - 缩放条       │                                      │
│ - 工具栏/右键  │                                      │
└───────────────┴──────────────────────────────────────┘
```

## 你要先学会认 3 个“变量”

在 `App.tsx` 里，你先只看这 3 件事：

### 1) nodes（节点数据）

```ts
const [nodes, setNodes] = useState<NodeData[]>(...)
```

你可以把 nodes 理解成：

> “画布上有哪些方块？每个方块在什么位置？长什么样？”

### 2) plugins（插件：决定有哪些编辑功能）

```ts
const plugins = useMemo(() => createDefaultEditorPluginsWithUI({ ... }), [...])
```

你可以把 plugins 理解成：

> “拖拽、框选、右键菜单、工具栏、小地图……这些功能到底开不开？”

### 3) InfiniteMap（画布组件）

```tsx
<InfiniteMap nodes={nodes} onNodesChange={setNodes} plugins={plugins} ... />
```

你可以把它理解成：

> “把 nodes 画出来，并把 plugins 提供的 UI 叠上去”

---

## 这章结束时你应该能回答

- Q：页面的核心组件是谁？  
  A：`<InfiniteMap />`

- Q：页面上那些“开关”控制什么？  
  A：控制 `createDefaultEditorPluginsWithUI({ ... })` 里哪些插件启用（它来自 `@qiuyulc/infinite-map-editor`）

下一章我们讲清楚：**nodes 到底是什么结构？它是怎么被渲染出来的？**
