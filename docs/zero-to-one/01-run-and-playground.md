# 01. 跑起来：playground 做了什么

这一章只干一件事：把“你看到的页面”对应回代码。

## 你在页面上看到什么？

以 `playground` 为例，你通常会看到：

- 左侧：本地测试面板（开关：标尺/minimap/工具栏/右键菜单/缩放条…）
- 右侧：InfiniteMap 画布（节点、背景、交互）

对应文件：

- `playground/src/App.tsx`

---

## App.tsx 最重要的 3 行（先抓住主干）

你在 `App.tsx` 里重点看：

1) 准备 nodes（节点数据）：

```ts
const [nodes, setNodes] = useState<NodeData[]>(() => {
  const base = makeDemoNodes(30);
  return computeLayout(base, 'grid', { seed: 1 });
});
```

2) 准备 plugins（编辑能力）：

```ts
const plugins = useMemo(() => {
  return createDefaultEditorPlugins({
    rulersEnabled,
    minimapEnabled,
    zoomDockEnabled,
    toolbarEnabled,
    contextMenuEnabled,
    marqueeEnabled: true,
    marqueeRequireShift: false,
  });
}, [...]);
```

3) 渲染画布：

```tsx
<InfiniteMap
  nodes={nodes}
  onNodesChange={(next) => setNodes(next)}
  plugins={plugins}
  themeBase={themeBase}
  backgroundMode={backgroundMode}
/>
```

---

## 你改一个开关，发生了什么？

举例：你把 “Minimap” 关掉。

1) 你的操作 → 改变 `minimapEnabled` state  
2) `plugins = createDefaultEditorPlugins({ minimapEnabled: false })`  
3) 默认插件集合里不会 push `createMinimapPlugin()`  
4) 结果：右下角 minimap 的 HUD overlay 就不会渲染

也就是说：

> 你看到的“编辑能力”，不是写死在 InfiniteMap 里，而是由 plugins 组合出来的。

---

## 你现在应该能回答的问题

读完这一章，你至少应该能回答：

- Q：节点数据从哪里来？  
  A：`makeDemoNodes` + `computeLayout`（都来自库对外导出）

- Q：为什么有些功能能开关？  
  A：因为它们是可选插件（createDefaultEditorPlugins 负责组合）

下一章我们去看：`InfiniteMap.tsx` 到底是怎么把画布画出来的。

