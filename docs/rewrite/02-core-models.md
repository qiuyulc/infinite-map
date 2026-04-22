# 02. 核心数据模型（Node / Camera / Patch）

这一章目标：

> 你能设计出一套“够用、好扩展、好讲”的数据模型，并知道为什么要这样设计。

---

## 1) NodeData（节点）

**你需要的最小字段：**

```ts
export type NodeData = {
  id: string
  x: number
  y: number
  w: number
  h: number
  z?: number
  type?: string
  data?: unknown
}
```

### 为什么要有 `type` 和 `data`？

- `type`：让业务方能渲染不同节点（卡片/图片/文本）
- `data`：节点的业务数据（标题、颜色、meta 等），库不关心内容结构

这就是“库 vs 业务”的边界：**库管坐标与交互，业务管内容。**

---

## 2) Camera（相机：决定你看到画布的哪一块）

最小结构：

```ts
export type Camera = {
  x: number
  y: number
  zoom: number
}
```

你可以把它理解成：

- `x/y`：当前视口左上角在“世界坐标”里的位置
- `zoom`：世界坐标 → 屏幕像素 的倍率

### 为什么用“左上角 + zoom”？

因为它最方便做两件事：

1) 计算“当前可见区域”的 world rect  
2) 做坐标换算（world ↔ screen）

---

## 3) Patch（统一的数据修改方式）

如果你希望项目“可扩展、可做 undo/redo、可做协作”，一个强烈建议是：

> 不要在 100 个地方直接改 nodes，而是把所有修改统一成 Patch，再统一 apply。

最小 patch 设计可以很简单：

```ts
export type NodePatch =
  | { type: 'set'; id: string; data: Partial<NodeData> }
  | { type: 'add'; node: NodeData }
  | { type: 'remove'; id: string }
```

然后所有插件只输出 patches：

- drag 插件：输出 `{type:'set', id, data:{x,y}}`
- resize 插件：输出 `{type:'set', id, data:{w,h}}`
- delete：输出 `{type:'remove', id}`

### 为什么这是面试亮点？

因为它直接带来：

- undo/redo：存 patch 或存快照都容易
- 协作：patch 就是同步消息
- 审计/调试：你能知道“是谁、因为什么”改了哪些节点

---

## 4) 坐标换算（最常见的“写不对就一团糟”点）

你至少要提供 2 个函数：

```ts
worldToScreen(p, camera) -> {x,y}
screenToWorld(p, camera) -> {x,y}
```

当用户拖拽节点时：

- 鼠标移动的是 screen 像素
- 节点位置是 world 坐标
- 所以你必须换算，否则 zoom 之后拖拽会“飘”

下一章我们会讲：渲染层如何用 camera + viewport 把节点画出来，以及 overlay/hud 如何分层。

