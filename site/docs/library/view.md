# 视图控制（铺满/居中/锁定）

本页介绍在“预览/只读”场景下，如何控制相机（camera）让某个节点铺满屏幕，以及如何锁定视图拖动。

## 1）核心概念：camera

Infinite Map 通过相机描述当前视图：

```ts
type Camera = { x: number; y: number; zoom: number }
```

- `(x, y)`：当前视图左上角在 **世界坐标系** 中的位置
- `zoom`：缩放倍率（越大越“放大”）

你可以通过 `apiRef` 读取/设置：

```ts
const cam = apiRef.current?.getCamera()
apiRef.current?.setCamera({ x: 0, y: 0, zoom: 1 }, { immediate: true })
```

## 2）让某个节点“铺满屏幕”（fit to node）

思路：把节点的 world rect 按 viewport（像素）计算一个合适的 zoom，并把节点中心对齐到屏幕中心。

### 2.1 计算公式（推荐）

```ts
type Rect = { x: number; y: number; w: number; h: number }
type Viewport = { w: number; h: number }
type Camera = { x: number; y: number; zoom: number }

export function fitRectToViewport(rect: Rect, vp: Viewport, paddingPx = 24): Camera {
  const vw = Math.max(1, vp.w - paddingPx * 2);
  const vh = Math.max(1, vp.h - paddingPx * 2);

  const zoom = Math.min(vw / rect.w, vh / rect.h);

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;

  return {
    zoom,
    x: cx - vp.w / (2 * zoom),
    y: cy - vp.h / (2 * zoom),
  };
}
```

### 2.2 在 React 中调用（示例）

```tsx
import { useLayoutEffect, useRef } from 'react';
import type { InfiniteMapApi, NodeData } from '@qiuyulc/infinite-map';

export function Preview({ nodes }: { nodes: NodeData[] }) {
  const apiRef = useRef<InfiniteMapApi | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const api = apiRef.current;
    const el = containerRef.current;
    if (!api || !el) return;

    const node = nodes.find((n) => n.id === 'cover');
    if (!node) return;

    const vp = { w: el.clientWidth, h: el.clientHeight };
    const cam = fitRectToViewport({ x: node.x, y: node.y, w: node.width, h: node.height }, vp, 24);
    api.setCamera(cam, { immediate: true });
  }, [nodes]);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh' }}>
      <InfiniteMap nodes={nodes} apiRef={apiRef} editMode="readonly" />
    </div>
  );
}
```

建议把调用时机放在：
- 页面进入预览时
- 容器尺寸变化时（ResizeObserver / window resize）
- 节点尺寸变化时（例如图片加载后节点尺寸变化）

## 3）锁定视图拖动（禁止平移）

如果你希望预览时不允许用户拖动画布：

```tsx
<InfiniteMap nodes={nodes} editMode="readonly" panEnabled={false} />
```

`panEnabled=false` 会禁用：
- 空白拖拽平移
- `Space` 平移模式
- 触控板两指平移（wheel pan）

## 4）固定画布模式（海报 / 封面）

默认相机以世界原点 `(0,0)` 为视口中心。如果你需要固定尺寸画布（例如 800×600 的海报），且希望节点坐标按"距左上角距离"来写：

```tsx
<InfiniteMap
  nodes={nodes}
  panEnabled={false}
  zoomEnabled={false}
  initialCamera={{ x: 0, y: 0, zoom: 1 }}
/>
```

- `initialCamera={{ x: 0, y: 0, zoom: 1 }}` 把视口左上角对齐世界原点
- 节点 `x: 30` 即距画布左边 30px，无需手动换算
- 搭配 `panEnabled={false}` 和 `zoomEnabled={false}` 锁定视口，模拟传统设计工具的固定画布体验

