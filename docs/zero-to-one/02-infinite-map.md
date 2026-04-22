# 02. InfiniteMap：画布是怎么画出来的

这章你只需要记住一个结论：

> **InfiniteMap 负责“显示”和“装配”，编辑能力由 plugins 提供。**

对应文件：

- `packages/infinite-map/src/components/InfiniteMap.tsx`

---

## InfiniteMap 内部的大概结构（先看图）

（这是“文字图”，你不用懂每一块，只要知道它们的层级）

```txt
InfiniteMap（React 组件）
  ├─ 背景层：BackgroundGrid / BackgroundDots
  ├─ 节点层：把 nodes[] 渲染成 DOM（默认用 DefaultNode）
  ├─ overlay 层（编辑辅助）：选中框/吸附线/框选等（来自插件 slot=overlay）
  └─ hud 层（界面）：toolbar / 右键菜单 / minimap / zoomDock / rulers（来自插件 slot=hud）
```

---

## 你在 InfiniteMap 里要找的 4 个关键词

打开 `InfiniteMap.tsx` 后，用搜索（Ctrl+F）找：

1) `backgroundMode`  
   - 你能看到网格/点阵是怎么切的

2) `nodes` / `onNodesChange`  
   - 你能看到节点如何被渲染、修改后如何回传

3) `plugins`  
   - 你能看到插件 runtime 是怎么被挂进来的

4) `slot` / `hud` / `overlay`  
   - 你能看到 overlay/hud 是怎么分层叠加的

---

## 为什么要把 “overlay/hud” 做分层？

你可以先用生活化理解：

- overlay：像“尺子/辅助线/选框”，应该盖在节点上面，但通常不应该挡住鼠标事件
- hud：像“工具栏/小地图/右键菜单”，是 UI 控件，需要能点击

所以我们给插件 overlay 提供了：

- `slot: 'overlay' | 'hud' | 'background'`
- `overlayPointerEvents: 'none' | 'auto'`

这样你以后新增一个 HUD（比如“搜索框”）不会影响选框和拖拽。

---

## 最小示例：如果不用任何插件，会发生什么？

你可以在 playground 里把插件全关掉（toolbar/minimap/contextmenu/zoomDock/rulers），你会看到：

- 画布仍然能显示背景 + 节点
- 但“编辑能力”（拖拽/框选/右键/缩放）会减少或没有

这说明：

> 渲染和编辑是分开的。InfiniteMap 是“画布”，Editor plugins 是“编辑器能力”。

下一章我们去看：Editor plugins 是怎么组合出来的。

