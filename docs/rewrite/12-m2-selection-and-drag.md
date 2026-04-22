# 12. Milestone 2：选中 + 拖拽节点（引入最小插件系统）

Milestone 0 你能“画出来”。Milestone 1 你能“移动视图（camera）”。  
Milestone 2 开始我们要做“编辑节点”最核心的两件事：

> 1) 点击选中节点（selection）  
> 2) 拖拽移动节点（drag）  

**并且从这一刻开始，我们必须引入“最小插件系统（Editor Runtime）”。**

为什么？

因为现在会出现“事件冲突”：

- 你按住 Space + 拖拽：应该平移画布（pan）
- 你直接拖拽节点：应该移动节点（drag）
- 你点击节点：应该选中（selection）

如果都写在一个组件里，很快就会变成 if/else 地狱，后面加 resize/框选/右键会彻底崩。

---

## 你将得到什么结果（先看目标）

你会得到这些行为：

1) 单击节点：出现选中框  
2) 空白单击：取消选中  
3) 拖拽选中节点：节点移动（考虑 zoom）  
4) Space + 拖拽：平移画布（不会误拖节点）  

---

## Step 0：这次要新增哪些文件？

我们新增一个最小 `editor/` 目录（注意：这是“库能力”，不属于 playground）：

```txt
packages/infinite-map/src/
  editor/types.ts
  editor/runtime.ts
  editor/createDefaultEditorPlugins.ts
  editor/keys.ts
  editor/plugins/selection/createSelectionPlugin.ts
  editor/plugins/selection/SelectionOverlay.tsx
  editor/plugins/transform/createDragPlugin.ts
```

并修改：

```txt
packages/infinite-map/src/components/InfiniteMap.tsx   # 接入 runtime，分发 pointer 事件
packages/infinite-map/src/index.ts                     # 导出 createDefaultEditorPlugins（给使用者）
```

---

## Step 1：定义最小的 MapContext（让插件能“拿到世界”）

文件：

`packages/infinite-map/src/editor/types.ts`

最小版本先写成这样（后面再扩展 bus/commands/services）：

```ts
import type { NodeData, Camera } from '../core/types'

export type MapContext = {
  getNodes(): NodeData[]
  setNodes(next: NodeData[]): void

  getCamera(): Camera
  setCamera(next: Camera): void

  // 共享状态：先只做 selection
  getSelectionIds(): string[]
  setSelectionIds(ids: string[]): void
}

export type InputHandlers = {
  onPointerDown?: (ctx: MapContext, e: PointerEvent) => void
  onPointerMove?: (ctx: MapContext, e: PointerEvent) => void
  onPointerUp?: (ctx: MapContext, e: PointerEvent) => void
}

export type InfiniteMapPlugin = {
  id: string
  handlers?: InputHandlers
  overlay?: (ctx: MapContext) => any
  slot?: 'overlay' | 'hud'
}
```

你现在只需要理解一句话：

> ctx 就是“插件能用的工具箱”：能读写 nodes、camera、selection。

---

## Step 2：写 Runtime（把事件分发给插件）

文件：

`packages/infinite-map/src/editor/runtime.ts`

最小版本（按顺序调用 handlers）：

```ts
import type { InfiniteMapPlugin, MapContext } from './types'

export function createRuntime(plugins: InfiniteMapPlugin[]) {
  const handlers = plugins.map((p) => p.handlers).filter(Boolean)
  const overlays = plugins.filter((p) => p.overlay && p.slot === 'overlay')
  const huds = plugins.filter((p) => p.overlay && p.slot === 'hud')

  return {
    handlePointerDown(ctx: MapContext, e: PointerEvent) {
      for (const h of handlers) h?.onPointerDown?.(ctx, e)
    },
    handlePointerMove(ctx: MapContext, e: PointerEvent) {
      for (const h of handlers) h?.onPointerMove?.(ctx, e)
    },
    handlePointerUp(ctx: MapContext, e: PointerEvent) {
      for (const h of handlers) h?.onPointerUp?.(ctx, e)
    },
    overlays,
    huds,
  }
}
```

这里的关键点只有一个：

> plugins 的数组顺序，就是事件优先级顺序。

后面我们会把 resize 放在 drag 前面，就是因为它要先抢到事件。

---

## Step 3：定义默认插件集合（先装 selection + drag）

文件：

`packages/infinite-map/src/editor/createDefaultEditorPlugins.ts`

先写最小版本：

```ts
import type { InfiniteMapPlugin } from './types'
import { createSelectionPlugin } from './plugins/selection/createSelectionPlugin'
import { createDragPlugin } from './plugins/transform/createDragPlugin'

export function createDefaultEditorPlugins(): InfiniteMapPlugin[] {
  return [
    // 注意顺序：先 selection，再 drag
    createSelectionPlugin(),
    createDragPlugin(),
  ]
}
```

为什么先 selection？

- 你按下鼠标时，如果命中了节点，应该先设置 selection（后续 drag 才知道拖哪个）

---

## Step 4：实现 Selection（点击选中）

### 4.1 命中测试（最小版）

我们先用最简单方式：用节点的 world rect 做命中测试。

文件：

`packages/infinite-map/src/editor/plugins/selection/createSelectionPlugin.ts`

```ts
import type { InfiniteMapPlugin, MapContext } from '../../types'

function hitTestNode(ctx: MapContext, pWorld: { x: number; y: number }) {
  const nodes = ctx.getNodes()
  // 简化：按数组顺序从后往前（认为后渲染的在上面）
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (pWorld.x >= n.x && pWorld.x <= n.x + n.w && pWorld.y >= n.y && pWorld.y <= n.y + n.h) return n
  }
  return null
}

export function createSelectionPlugin(): InfiniteMapPlugin {
  return {
    id: 'selection',
    handlers: {
      onPointerDown(ctx, e) {
        // 注意：这里的 e.clientX/Y 是屏幕像素；你需要换算到 world
        // 这一步的换算我们放到 InfiniteMap 里做：把 “pointWorld” 放进 ctx（后面会升级）
        // 为了教程先简单处理：让 InfiniteMap 把 world 坐标挂到事件上
        const anyE = e as any
        const pWorld = anyE.__world as { x: number; y: number } | undefined
        if (!pWorld) return
        const hit = hitTestNode(ctx, pWorld)
        if (hit) ctx.setSelectionIds([hit.id])
        else ctx.setSelectionIds([])
      },
    },
    slot: 'overlay',
    overlay: (ctx) => ({ type: 'SelectionOverlay', selectionIds: ctx.getSelectionIds() }),
  }
}
```

> 这里我们为了教学速度，用了一个“临时技巧”：把 world 坐标塞到事件里。  
> 后面（Milestone 3）我们会把它收敛成正式的 InputEvent 结构，不会污染原生事件。

### 4.2 选中框 UI（最小版）

文件：

`packages/infinite-map/src/editor/plugins/selection/SelectionOverlay.tsx`

最小版只画一个边框（单选）：

```tsx
import type { CSSProperties } from 'react'
import type { MapContext } from '../../types'

export function SelectionOverlay({ ctx }: { ctx: MapContext }) {
  const ids = ctx.getSelectionIds()
  if (ids.length !== 1) return null
  const id = ids[0]
  const n = ctx.getNodes().find((x) => x.id === id)
  if (!n) return null
  const cam = ctx.getCamera()

  const style: CSSProperties = {
    position: 'absolute',
    left: (n.x - cam.x) * cam.zoom,
    top: (n.y - cam.y) * cam.zoom,
    width: n.w * cam.zoom,
    height: n.h * cam.zoom,
    border: '2px solid rgba(110, 200, 255, 0.95)',
    boxShadow: '0 0 0 3px rgba(110, 200, 255, 0.12)',
    borderRadius: 10,
    pointerEvents: 'none',
  }

  return <div style={style} />
}
```

关键点：

- overlay 的坐标也要受 camera 影响（同样用 `(world - cam) * zoom`）
- `pointerEvents: none`：选中框不挡鼠标

---

## Step 5：实现 Drag（拖拽移动）

文件：

`packages/infinite-map/src/editor/plugins/transform/createDragPlugin.ts`

最小实现思路：

1) 按下：如果命中选中节点，记录起点（world）和节点初始位置  
2) 移动：计算 deltaWorld，更新 node.x/y  
3) 抬起：结束拖拽  

示例代码（单选）：

```ts
import type { InfiniteMapPlugin, MapContext } from '../../types'

export function createDragPlugin(): InfiniteMapPlugin {
  let dragging:
    | null
    | {
        id: string
        startWorld: { x: number; y: number }
        startNode: { x: number; y: number }
      } = null

  return {
    id: 'drag',
    handlers: {
      onPointerDown(ctx, e) {
        const ids = ctx.getSelectionIds()
        if (ids.length !== 1) return
        const id = ids[0]
        const anyE = e as any
        const pWorld = anyE.__world as { x: number; y: number } | undefined
        if (!pWorld) return
        const node = ctx.getNodes().find((n) => n.id === id)
        if (!node) return

        // 如果鼠标没有点在节点上，就不开始拖拽（否则空白也会拖）
        const hit =
          pWorld.x >= node.x && pWorld.x <= node.x + node.w && pWorld.y >= node.y && pWorld.y <= node.y + node.h
        if (!hit) return

        dragging = { id, startWorld: pWorld, startNode: { x: node.x, y: node.y } }
      },

      onPointerMove(ctx, e) {
        if (!dragging) return
        const anyE = e as any
        const pWorld = anyE.__world as { x: number; y: number } | undefined
        if (!pWorld) return
        const dx = pWorld.x - dragging.startWorld.x
        const dy = pWorld.y - dragging.startWorld.y

        const next = ctx.getNodes().map((n) => {
          if (n.id !== dragging!.id) return n
          return { ...n, x: dragging!.startNode.x + dx, y: dragging!.startNode.y + dy }
        })
        ctx.setNodes(next)
      },

      onPointerUp() {
        dragging = null
      },
    },
  }
}
```

这里你要记住的关键点：

> **拖拽要用 world 坐标的 delta**，这样 zoom 之后手感才正确。

---

## Step 6：把 Runtime 接到 InfiniteMap 上（事件分发 + 渲染 overlay）

回到：

`packages/infinite-map/src/components/InfiniteMap.tsx`

你要做三件事：

1) 创建 runtime：`createRuntime(plugins)`
2) 在 pointer 事件里把 `clientX/Y` 转换为 world 坐标
3) 调用 `runtime.handlePointerXxx(ctx, e)`
4) 把 overlay/hud 渲染出来

### 6.1 把屏幕坐标转 world（并写进事件）

你已经在 Milestone 1 写过 `screenToWorld`：

```ts
const rect = rootEl.getBoundingClientRect()
const pScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
const pWorld = screenToWorld(pScreen, cam)
;(e as any).__world = pWorld
```

### 6.2 分发事件

```ts
runtime.handlePointerDown(ctx, e)
```

### 6.3 渲染 overlay（最小）

你在 runtime 里收集了 `overlays`，但我们现在最简单做法是：

- selection overlay 直接作为 React 组件渲染（不要用上面那个“对象占位”）

所以更推荐你在 selection 插件里直接返回 React 组件：

```ts
overlay: ({ ctx }) => <SelectionOverlay ctx={ctx} />
```

（你现在的项目已经支持这种形式，照着写就行。）

---

## Step 7：在 playground 验证（最重要）

验证清单：

1) 点节点：出现选中框  
2) 拖节点：节点移动  
3) 空白点：选中清空  
4) Space+拖动：平移画布（不影响节点拖拽）  
5) 缩放后拖节点：仍然正确（不会飘）  

---

## 常见坑（最容易卡的点）

### 1) 拖拽在 zoom 后速度不对

原因：你用的是 screen delta 而不是 world delta。  
解决：用 `screenToWorld` 得到 world，然后用 world 的差值。

### 2) 选中框位置不对

原因：overlay 没有应用 camera（仍然用 world 坐标）。  
解决：overlay 也必须用 `(world - cam) * zoom`。

### 3) Space 平移和拖拽节点互相影响

解决思路（最小版）：

- Space 按下时：pan 生效，drag 不生效
- Space 没按：drag 生效

后面我们会把它升级为“键盘状态插件”，让这件事更干净。

---

## 本章结束：你能讲出来的一句话（面试）

> 我在 Milestone 2 引入了最小 Editor Runtime：把 selection/drag 等交互拆成插件，并按顺序分发 pointer 事件，避免能力之间互相抢事件。拖拽使用 world delta（通过 screenToWorld 换算）保证在不同缩放级别下手感一致。

---

## 下一步（Milestone 3 预告）

Milestone 3 我们会把“最小 runtime”升级为“可扩展库级 runtime”：

- 加 store/bus（更稳的状态共享与通知）
- 加 command（让 toolbar/右键/快捷键复用逻辑）
- 加 history（undo/redo）
- 然后再做：resize、框选、右键菜单、minimap

