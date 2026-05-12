---
slug: /infinite-map/07-camera-viewport
---

# 7. 坐标 & Camera

> 涉及的源文件：`hooks/useCoordinateTransforms.ts`、`hooks/useViewportSize.ts`、`hooks/useWheelControls.ts`
>
> 管理世界坐标系、屏幕坐标系之间的变换，以及视口尺寸和滚轮/触控板交互。

---

## 7.1 坐标系关系

```
屏幕坐标 (Screen)                    世界坐标 (World)
  ┌────────────────┐                  ───────────────────→ X
  │  (0,0)         │                  │
  │    ● (sx,sy)   │                  │  (camera.x, camera.y)
  │                │                  │    ┌───────────┐
  │  视口 (像素)    │                  │    │  (wx,wy)● │
  │  viewport.w×h  │                  │    │           │
  └────────────────┘                  │    └───────────┘
                                      ↓ Y
```

**变换公式：**

```
worldX = camera.x + screenX / zoom
worldY = camera.y + screenY / zoom

screenX = (worldX - camera.x) × zoom
screenY = (worldY - camera.y) × zoom
```

---

## 7.2 useCoordinateTransforms

```ts
const screenToWorld = useCallback((p) => ({
  x: cameraRef.current.x + p.x / (cameraRef.current.zoom || 1),
  y: cameraRef.current.y + p.y / (cameraRef.current.zoom || 1),
}), [cameraRef]);

const worldToScreen = useCallback((p) => ({
  x: (p.x - cameraRef.current.x) * (cameraRef.current.zoom || 1),
  y: (p.y - cameraRef.current.y) * (cameraRef.current.zoom || 1),
}), [cameraRef]);
```

函数引用稳定（`useCallback`），因为 `cameraRef` 是 ref 对象，永远不变。

---

## 7.3 useViewportSize

```
ResizeObserver → rAF 去抖 → setState({w, h}) + 同步更新 viewportRef
```

双输出：
- `viewport`（React state）→ 触发组件重渲染
- `viewportRef`（ref）→ 供 ctx.getViewport() 同步读取

---

## 7.4 useWheelControls

```ts
onWheel(e) {
  e.preventDefault();

  // 判断缩放还是平移
  const isPinch = e.ctrlKey;
  const shouldZoom = isPinch || e.deltaMode > 0;

  if (shouldZoom) {
    // 以鼠标位置为中心缩放
    const wx = cam.x + mouseX / zoom;
    const nextZoom = clamp(zoom * exp(-dy * speed), min, max);
    const nextX = wx - mouseX / nextZoom;
    commitCamera({ x: nextX, y: nextY, zoom: nextZoom });
  } else {
    // 平移
    commitCamera({ x: cam.x + dx/zoom, y: cam.y + dy/zoom, zoom });
  }
}
```

**以鼠标为中心缩放** 是关键 UX：放大时鼠标指向的世界坐标点保持在原位，不会"漂走"。
