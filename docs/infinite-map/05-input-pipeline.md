# 5. 输入管线

> 涉及的源文件：`hooks/usePluginInputDispatch.ts`
>
> 实现 Scheme C 输入管线——将原生 DOM 事件转换为插件的 hitTest / processor / gesture 调用。

---

## 5.1 入口

`InfiniteMapEngine` 在容器 `<div>` 上绑定 pointer/key/contextmenu 事件：

```tsx
<div
  onPointerDownCapture={e => dispatchPointer('down', e)}
  onPointerMoveCapture={e => dispatchPointer('move', e)}
  onPointerUpCapture={e => dispatchPointer('up', e)}
  onContextMenuCapture={e => dispatchContextMenu(e)}
>
```

使用 **Capture 阶段**（而非 Bubble），确保 InfiniteMap 先于子元素处理事件。

---

## 5.2 dispatchPointer 流程

```ts
dispatchPointer(type, e) {
  1. 采样 containerRect（仅在 down 时）
  2. 计算 screen 坐标（相对容器）和 world 坐标
  3. 收集所有启用的插件贡献的 hitTests/processors/gestures
  4. 追加内置 pan gesture（priority=-9999）

  若 type === 'down':
    5a. runHitTest → 找到命中目标
    5b. run processors → selection 等非互斥逻辑
    5c. 按 priority 尝试 gesture.canStart → 启动第一个匹配的

  若 type === 'move' && 无 active gesture:
    5d. runHitTest → hover 检测、cursor 更新

  若 type === 'move/up/cancel' && 有 active gesture:
    5e. 派发给 active gesture.onMove/onEnd/onCancel
}
```

---

## 5.3 坐标采样

```ts
// 容器 rect 只在 down 时采样一次（move 时复用）
if (!containerRectRef.current || type === 'down') {
  const r = el.getBoundingClientRect();
  containerRectRef.current = { left: r.left, top: r.top };
}

// 屏幕坐标（相对容器）
const sx = e.clientX - rect.left;
const sy = e.clientY - rect.top;

// 世界坐标
const world = screenToWorld({ x: sx, y: sy });
```

**为什么只在 down 时采样？** `getBoundingClientRect` 会触发 layout（强制回流），在高频 move 事件中调用会导致性能问题。

---

## 5.4 Hover 处理

当 `type === 'move'` 且没有 active gesture 时：

```ts
const hit = runHitTest();
if (!sameHit(prevHit, hit)) {
  hoverRef.current = hit;
  store.set('hover:hit', hit);
  bus.emit('hover:change', { prev, next: hit });
  // 通知所有 inputHooks.onHoverChange
}
// 更新光标样式
containerRef.style.cursor = cursorFromHit(hit);
```

---

## 5.5 Key 事件

```ts
window.addEventListener('keydown', (e) => {
  if (!containerRef.contains(document.activeElement)) return;
  for (const p of plugins) {
    const res = p.input?.onKeyDown?.(mapKeyEvent, ctx);
    if (res?.handled) { e.preventDefault(); return; }
  }
});
```

**只在画布聚焦时生效**，避免劫持页面全局快捷键。

---

## 5.6 ContextMenu 事件

```ts
dispatchContextMenu(e) {
  1. runHitTest({ kind: 'contextmenu' })
  2. 遍历插件 input.onContextMenu
  3. 第一个 handled 的插件获胜（如 context menu plugin）
}
```
