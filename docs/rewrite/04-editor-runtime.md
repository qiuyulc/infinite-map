# 04. Editor Runtime（插件装配器）

这一章目标：

> 你能从 0 写出一个“插件装配器”，让功能模块（拖拽/框选/右键菜单）可以插拔。

---

## 1) 你为什么需要 Runtime？

因为你不想把所有能力堆在 `InfiniteMap.tsx`：

- drag：要监听 pointermove
- selection：要监听 pointerdown
- context menu：要监听右键 + 渲染菜单
- minimap：要渲染 hud + 改 camera

如果没有 runtime，这些能力会互相 import、互相调用，最后一团糟。

Runtime 的任务就是一句话：

> 把一堆插件“插上去”，并让它们共享同一个 ctx（上下文）。

---

## 2) Plugin 最小协议（从 0 设计）

最小版本（Scheme C 风格）你可以只支持：

```ts
type Plugin = {
  id: string
  // pointer：统一走 hitTest + gesture（互斥）
  hitTests?: HitTestContributor[]
  gestures?: Gesture[]
  // 非指针输入：wheel / key / contextmenu
  input?: {
    onWheel?: ...
    onKeyDown?: ...
    onKeyUp?: ...
    onContextMenu?: ...
  }
  overlay?: (ctx) => ReactNode
  slot?: 'overlay' | 'hud'
}
```

后续再加：

- commands（命令系统）
- store/bus（共享状态与事件）
- services（可替换能力注入）

---

## 3) Runtime 最小实现思路（伪代码）

```txt
createRuntime(plugins, ctx):
  1. 把 plugins 排序（生命周期/依赖顺序；pointer 不再靠顺序抢事件）
  2. 统一注册事件监听（pointer/wheel/keyboard/contextmenu）
  3. pointer：
     - hitTest：计算命中 target
     - 选择一个 gesture 启动，并在 move/up/cancel 只派发给 active gesture
  4. wheel/key/contextmenu：交给 plugins[i].input?.onXxx
  5. 收集 overlays：按 slot 分组渲染到不同层
```

你现在的项目已经有更完整的版本（store/commands/services），你从 0 写时可以先写最小版，再逐步补。

---

## 4) “顺序为什么重要”（用人话解释）

比如：

- resize handle 被按住时，应该先走 resize，而不是 drag
- 在空白区域拖拽时，可能是框选（marquee）也可能是平移（space）

所以插件要有顺序（优先级），否则用户体验会乱。

Scheme C 的关键变化是：
- pointer 的“抢事件”主要由 gesture.priority 决定（互斥）
- 插件排序更多用于 setup/teardown/commands/service 依赖顺序

下一章我们会写清楚：插件协议如何逐步扩展成可扩展的“库级能力”（commands/store/bus/services）。
