# 10. Milestone 0：只渲染 nodes（最小可跑版本）

这一章我们不做任何“编辑能力”（不做拖拽、不做缩放、不做右键菜单）。  
只做一件事：

> **给一组 nodes（方块描述），把它们渲染在屏幕上。**

如果你能把这一步做出来，你就已经有了“画布的最小骨架”，后面所有能力都是在这个骨架上叠加的。

---

## 你将得到什么结果（先看目标）

最终你会看到一个页面：

- 白色背景（先不做网格/点阵）
- 画布上有 N 个方块（节点）
- 每个方块能显示 id 或标题

> 这一步的意义：先把“数据 → UI”跑通，别一上来就陷入复杂交互。

---

## Step 0：你需要哪些最小文件？

在 `packages/infinite-map/src/` 里，你只需要先有这些文件：

```txt
src/
  core/types.ts                 # 定义 NodeData 类型
  components/InfiniteMap.tsx    # 把 nodes 渲染出来
  index.ts                      # 对外导出 InfiniteMap / NodeData
```

---

## Step 1：定义 NodeData（最小版本）

文件：

`packages/infinite-map/src/core/types.ts`

最小建议（先别做太复杂）：

```ts
export type NodeData = {
  id: string
  x: number
  y: number
  w: number
  h: number
  data?: {
    title?: string
  }
}
```

为什么需要 `x/y/w/h`？

- `x/y`：节点在画布上的位置（左上角）
- `w/h`：节点尺寸

---

## Step 2：写 InfiniteMap（最小渲染版本）

文件：

`packages/infinite-map/src/components/InfiniteMap.tsx`

先写一个“纯渲染组件”：

```tsx
import type { CSSProperties } from 'react'
import type { NodeData } from '../core/types'

export type InfiniteMapProps = {
  nodes: NodeData[]
}

export function InfiniteMap({ nodes }: InfiniteMapProps) {
  const root: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: '#fff',
  }

  return (
    <div style={root}>
      {nodes.map((n) => {
        const style: CSSProperties = {
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.w,
          height: n.h,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(15,23,42,0.15)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.10)',
          padding: 10,
          boxSizing: 'border-box',
          color: 'rgba(15,23,42,0.9)',
          fontSize: 12,
        }

        return (
          <div key={n.id} style={style}>
            <div style={{ fontWeight: 700 }}>{n.data?.title ?? n.id}</div>
            <div style={{ opacity: 0.6, marginTop: 6 }}>
              x:{n.x} y:{n.y} w:{n.w} h:{n.h}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

你现在只需要理解两件事：

1) `position: relative`：让子元素的 `absolute` 相对于它定位  
2) `left/top/width/height`：直接用 node 的 `x/y/w/h` 去摆放

---

## Step 3：对外导出（index.ts）

文件：

`packages/infinite-map/src/index.ts`

导出你刚写的最小能力：

```ts
export { InfiniteMap } from './components/InfiniteMap'
export type { NodeData } from './core/types'
```

---

## Step 4：在 playground 里用起来（验证最重要）

文件：

`playground/src/App.tsx`

最小使用方式（示例）：

```tsx
import { useState } from 'react'
import { InfiniteMap, type NodeData } from '@qiuyulc/infinite-map'

export default function App() {
  const [nodes] = useState<NodeData[]>([
    { id: 'a', x: 60, y: 60, w: 220, h: 120, data: { title: '节点 A' } },
    { id: 'b', x: 320, y: 120, w: 260, h: 140, data: { title: '节点 B' } },
  ])

  return (
    <div style={{ height: '100vh' }}>
      <InfiniteMap nodes={nodes} />
    </div>
  )
}
```

你启动 playground：

```bash
pnpm -C playground dev
```

你应该能看到两个卡片出现在画布上。

---

## 常见坑（0基础最容易卡）

### 1) 节点不显示

检查：

- 父容器是否有高度（例如 `height: 100vh`）
- InfiniteMap root 是否 `position: relative`

### 2) 节点位置不对

检查：

- 节点 style 是否 `position: absolute`
- 是否写反了 `left/top`

---

## 这一章结束后，你应该能说出来的“面试一句话”

> 我先把编辑器拆成最小可运行版本：用 NodeData（x/y/w/h）描述节点，再用 InfiniteMap 把 nodes 渲染成绝对定位 DOM，为后续 camera/缩放/插件化编辑能力打底。

---

## 下一步做什么？

下一章（Milestone 1）我们会加入 camera（x/y/zoom）：

- 让画布能缩放（wheel）
- 让画布能平移（space + drag）

但注意：**我们不会立刻做拖拽节点**，先把“视图移动”搞稳。

