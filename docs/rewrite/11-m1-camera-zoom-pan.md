# 11. Milestone 1：加入 Camera（缩放 + 平移）

在 Milestone 0 里，你已经能把 nodes 渲染出来了。  
Milestone 1 我们要做的，是让画布“像真的画布一样能动”：

> **滚轮缩放（zoom） + 平移（pan）**  

这一章仍然遵守我们的写法：**按步骤写、按文件写、每一步都有可运行的示例**。

---

## 你将得到什么结果（先看目标）

你会在页面上获得这些能力：

1) 鼠标滚轮：缩放画布（节点一起缩放）  
2) 按住 Space + 拖拽：平移画布（节点一起移动）  
3) 缩放后拖拽仍然稳定（不会“飘”）  

文字图（你脑内要形成这个画面）：

```txt
滚轮向上 → zoom 变大 → 看起来“放大”
滚轮向下 → zoom 变小 → 看起来“缩小”
按住 Space + 拖动 → x/y 改变 → 画布平移
```

---

## Step 0：你需要新增哪些文件？

在 Milestone 0 的基础上，我们新增这些文件：

```txt
packages/infinite-map/src/
  core/types.ts                 # 新增 Camera 类型
  core/coords.ts                # 新增 坐标换算工具（world/screen）
  hooks/useViewportSize.ts      # 获取容器宽高
  hooks/useWheelZoom.ts         # 滚轮缩放（最小版）
  hooks/useSpacePan.ts          # Space + 拖拽 平移（最小版）
  components/InfiniteMap.tsx    # 接入 camera + viewport + 事件
```

> 注意：我们还不引入插件系统。Milestone 1 仍然是“纯组件 + hooks”。

---

## Step 1：在 core/types.ts 增加 Camera

文件：

`packages/infinite-map/src/core/types.ts`

新增：

```ts
export type Camera = {
  x: number
  y: number
  zoom: number
}
```

你现在的理解方式：

- `x/y`：视口左上角在 world 的位置
- `zoom`：放大倍数（1 = 100%）

---

## Step 2：写坐标换算（世界坐标 ↔ 屏幕坐标）

文件：

`packages/infinite-map/src/core/coords.ts`

先写最小的两个函数：

```ts
import type { Camera } from './types'

export function worldToScreen(p: { x: number; y: number }, cam: Camera) {
  return {
    x: (p.x - cam.x) * cam.zoom,
    y: (p.y - cam.y) * cam.zoom,
  }
}

export function screenToWorld(p: { x: number; y: number }, cam: Camera) {
  return {
    x: p.x / cam.zoom + cam.x,
    y: p.y / cam.zoom + cam.y,
  }
}
```

为什么必须写这个？

- 鼠标移动量是“屏幕像素”
- 节点坐标是“世界坐标”
- zoom != 1 时，不换算就会出现拖拽/命中测试全错

---

## Step 3：拿到 viewport（容器宽高）

文件：

`packages/infinite-map/src/hooks/useViewportSize.ts`

最小实现（用 ResizeObserver）：

```ts
import { useEffect, useState } from 'react'

export function useViewportSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 1, h: 1 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return size
}
```

为什么需要 viewport？

后面我们要实现“以鼠标位置为中心缩放”，需要知道鼠标在容器内的位置（screen point）。

---

## Step 4：滚轮缩放（最小版，先以鼠标位置为中心）

文件：

`packages/infinite-map/src/hooks/useWheelZoom.ts`

目标：滚轮改变 zoom，并且保持“鼠标指着的 world 点”不动（体验最好）。

```ts
import { useCallback } from 'react'
import type { Camera } from '../core/types'
import { screenToWorld } from '../core/coords'

export function useWheelZoom(opts: {
  getCamera: () => Camera
  setCamera: (next: Camera) => void
  minZoom?: number
  maxZoom?: number
  zoomStep?: number
}) {
  const { getCamera, setCamera, minZoom = 0.25, maxZoom = 2.5, zoomStep = 1.1 } = opts

  return useCallback(
    (e: WheelEvent, pointInElement: { x: number; y: number }) => {
      // trackpad 的 deltaY 很细；先简单处理：deltaY < 0 放大，>0 缩小
      const cam = getCamera()
      const dir = e.deltaY < 0 ? 1 : -1
      const nextZoom = Math.max(minZoom, Math.min(maxZoom, cam.zoom * (dir > 0 ? zoomStep : 1 / zoomStep)))

      // 关键：以鼠标位置为中心缩放
      const before = screenToWorld(pointInElement, cam)
      const next: Camera = { ...cam, zoom: nextZoom }
      const after = screenToWorld(pointInElement, next)

      // 调整 x/y，让 before 仍然对齐到鼠标点
      next.x += before.x - after.x
      next.y += before.y - after.y

      setCamera(next)
    },
    [getCamera, setCamera, minZoom, maxZoom, zoomStep]
  )
}
```

这段代码你只要记住一句话：

> 缩放前后，把鼠标点对应的 world 坐标对齐回去，就不会“飘”。

---

## Step 5：Space + 拖拽平移（最小版）

文件：

`packages/infinite-map/src/hooks/useSpacePan.ts`

```ts
import { useEffect, useRef } from 'react'
import type { Camera } from '../core/types'

export function useSpacePan(opts: {
  elRef: React.RefObject<HTMLElement | null>
  getCamera: () => Camera
  setCamera: (next: Camera) => void
}) {
  const { elRef, getCamera, setCamera } = opts
  const spaceDownRef = useRef(false)
  const dragRef = useRef<null | { sx: number; sy: number; cx: number; cy: number }>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const onDown = (e: PointerEvent) => {
      if (!spaceDownRef.current) return
      const cam = getCamera()
      dragRef.current = { sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y }
      el.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      const s = dragRef.current
      if (!s) return
      const cam = getCamera()
      const dx = (e.clientX - s.sx) / cam.zoom
      const dy = (e.clientY - s.sy) / cam.zoom
      setCamera({ ...cam, x: s.cx - dx, y: s.cy - dy })
    }
    const onUp = () => {
      dragRef.current = null
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [elRef, getCamera, setCamera])
}
```

为什么 dx/dy 要除以 zoom？

> 因为鼠标移动 100px，在放大 2 倍时，对应世界坐标只移动 50（否则平移会过快）。

---

## Step 6：把 camera 接入 InfiniteMap 渲染

回到：

`packages/infinite-map/src/components/InfiniteMap.tsx`

我们现在要做两件事：

1) 节点的位置/尺寸要乘 zoom，并减去 camera.x/y  
2) 接入 wheel & space pan

节点渲染部分改成（关键行）：

```ts
const left = (n.x - cam.x) * cam.zoom
const top  = (n.y - cam.y) * cam.zoom
const w    = n.w * cam.zoom
const h    = n.h * cam.zoom
```

> 这就是“camera 生效”的核心：世界坐标先减 camera，再乘 zoom。

事件部分：

- onWheel：算出鼠标在容器内的点（相对位置），喂给 `useWheelZoom`
- pointerdown/move：交给 `useSpacePan`

---

## Step 7：在 playground 验证

你在 `playground/src/App.tsx` 的最小示例里：

- 把 `<InfiniteMap />` 放进 `height: 100vh` 的容器
- 准备几组 nodes（分散一些）

启动：

```bash
pnpm -C playground dev
```

测试清单：

1) 滚轮缩放：节点整体放大/缩小  
2) 缩放后继续滚轮：以鼠标位置为中心缩放（不会漂移）  
3) Space + 拖动：画布平移（节点整体移动）  

---

## 本章结束：你能讲出来的一句话（面试）

> 我在渲染层引入了 Camera（x/y/zoom）和 world/screen 坐标换算。缩放采用“以鼠标位置为中心”的算法，避免缩放漂移；平移采用 screen delta / zoom 的换算，保证不同缩放级别下手感一致。

---

## 下一步（Milestone 2 预告）

Milestone 2 我们才开始“编辑节点”：

- 点选节点（selection）
- 拖拽节点（drag）

注意：这时会出现一个新问题——**平移 vs 拖拽节点会抢事件**。  
这就是我们引入“插件系统（Editor Runtime）”的理由。

