---
slug: /infinite-map/02-engine-store
---

# 2. Engine Store

> 涉及的源文件：`engine/engineStore.ts`、`engine/useEngineSelector.tsx`、`engine/index.ts`
>
> Engine Store 是 infinite-map 的性能核心——它解决了"高频更新（每帧 60 次）不能走 React Fiber"的问题。

---

## 2.1 为什么需要独立的 Store？

React 的渲染机制：
- `setState` → 标记组件 dirty → 调度 Fiber 任务 → diff → commit
- 这个过程对于"用户拖动画布平移"这种 60fps 的场景太重了

**对比：**

| 方式 | 拖拽时每帧做的事 | 性能 |
|---|---|---|
| React state | re-render InfiniteMap + 所有子组件 | 卡顿 |
| Zustand vanilla | 直接修改 DOM style | 流畅 |

**设计决策：高频状态通过 subscribe + rAF 直接操作 DOM，只有低频状态走 React。**

---

## 2.2 Store 结构

```ts
// engine/engineStore.ts

type EngineState = {
  view: ViewSnapshot;           // camera + 预计算的 CSS transform
  viewport: { w: number; h: number };  // 画布容器像素尺寸
  interaction: {               // 交互状态标记
    panning: boolean;
    draggingNode: boolean;
  };
  visibleNodeIds: string[];    // 虚拟化后的可见节点 id 列表
};

type EngineActions = {
  setViewport: (vp) => void;
  setInteraction: (next) => void;
  setView: (camera) => void;
  setVisibleNodeIds: (ids) => void;
};
```

**四个字段的更新频率：**

| 字段 | 触发频率 | 更新方式 |
|---|---|---|
| `view` | 拖拽/缩放时每帧 | Zustand set → subscribe → 直接写 DOM |
| `viewport` | 容器 resize 时 | ResizeObserver → rAF → setViewport |
| `interaction` | 手势 start/end 时 | 低频 |
| `visibleNodeIds` | camera/viewport/nodes 变化 | rAF 去抖后批量更新 |

---

## 2.3 ViewSnapshot — 预计算的 transform

```ts
type ViewSnapshot = Camera & {
  transform: string;  // CSS transform 字符串，直接写入 DOM
};
```

`cameraToTransform` 函数：

```ts
function cameraToTransform(cam: Camera): string {
  const z = cam.zoom || 1;
  return `translate3d(${-cam.x * z}px, ${-cam.y * z}px, 0) scale(${z})`;
}
```

**为什么是负的？**

```
世界坐标原点 (0,0) 在屏幕上应该出现在哪里？

如果 camera.x = 100：
  世界坐标 x=100 处的点应该在屏幕最左边（x=0）
  screenX = (100 - 100) × zoom = 0  ✓

对应 CSS transform：
  把整个节点层向左移动 camera.x × zoom 像素
  → translate3d(-100 × zoom, 0, 0)
```

`transform` 是**预计算的**：每次 `setView` 时一并计算好，订阅者直接读 `view.transform` 写入 DOM，不需要再算一遍。

---

## 2.4 Store 创建

```ts
function createEngineStore(initialCamera: Camera) {
  return createStore(
    subscribeWithSelector<EngineState & EngineActions>((set) => ({
      // 初始状态
      view: {
        ...initialCamera,
        transform: cameraToTransform(initialCamera),
      },
      viewport: { w: 0, h: 0 },
      interaction: { panning: false, draggingNode: false },
      visibleNodeIds: [],

      // Actions
      setViewport: (vp) => set({ viewport: vp }),
      setInteraction: (next) =>
        set((s) => ({ interaction: { ...s.interaction, ...next } })),
      setView: (next) =>
        set({ view: { ...next, transform: cameraToTransform(next) } }),
      setVisibleNodeIds: (ids) => set({ visibleNodeIds: ids }),
    }))
  );
}
```

**关键设计：**

1. **`subscribeWithSelector` 中间件**：允许订阅者只监听特定字段的变化，避免无关更新触发回调。

```ts
// 只订阅 view.transform 变化，viewport 变化不触发
store.subscribe(
  (s) => s.view.transform,
  (transform) => { el.style.transform = transform; },
  { equalityFn: Object.is }
);
```

2. **`setView` 自动计算 transform**：调用者只需传 `{x, y, zoom}`，transform 字符串自动生成。

---

## 2.5 两条渲染路径

### 原生轨道（高频）

```
用户拖拽/缩放
  → commitCamera({x, y, zoom})
  → engineStore.getState().setView(next)
  → subscribe 回调触发
  → 直接写 DOM:
      viewportDom.style.transform = view.transform
      backgroundSvg.patternTransform = ...
```

**不经过 React。** 节点层 `<div>` 的 `style.transform` 被直接修改，浏览器只做 composite（GPU 合成），不触发 layout/paint。

### React 轨道（低频）

```
nodes 变化（新增/删除/修改内容）
  → setNodes(next)
  → React re-render
  → <EngineDomNodesLayer> 重新生成 JSX
```

节点内容（文字、图表、自定义组件）走 React，因为这些本身就依赖 React 的声明式渲染。

---

## 2.6 useEngineSelector — React 桥接

```ts
// engine/useEngineSelector.tsx

function useEngineSelector<T>(
  store: EngineStore,
  selector: (s: EngineState & EngineActions) => T,
  equalityFn: (a: T, b: T) => boolean
): T {
  return useSyncExternalStore(
    (listener) => store.subscribe(selector, () => listener(), { equalityFn }),
    () => selector(store.getState())
  );
}
```

**这是 React 读取 Engine Store 的唯一入口。**

底层使用 `useSyncExternalStore`（React 18 的并发安全外部 store hook），保证：
- 在 React 并发渲染时不出现"撕裂"（tearing）
- 仅在 selector 返回值变化时触发重渲染

**使用限制：只能用于低频订阅。**

```tsx
// ✅ 好的用法：visibleNodeIds 变化时重新渲染节点
const ids = useEngineSelector(
  engine.store,
  (s) => s.visibleNodeIds,
  (a, b) => a.length === b.length && a.every((x, i) => x === b[i])
);

// ❌ 坏的用法：订阅 view（会导致每帧重渲染）
const view = useEngineSelector(engine.store, (s) => s.view, Object.is);
```

---

## 2.7 完整数据流

```
                    ┌──────────────────┐
                    │   ResizeObserver  │
                    │ (useViewportSize) │
                    └────────┬─────────┘
                             │ setViewport({w,h})
                             ▼
┌──────────┐      ┌─────────────────────┐      ┌──────────────┐
│ 用户输入  │─────→│  InfiniteMapEngine   │─────→│  engineStore │
│ (wheel/  │      │  commitCamera()      │      │  .setView()  │
│  drag)   │      │  scheduleCompute()   │      │  .setVPort() │
└──────────┘      └─────────────────────┘      └──────┬───────┘
                                                       │
                    ┌──────────────────────────────────┤
                    │ subscribe                        │ subscribe
                    ▼                                  ▼
          ┌─────────────────┐              ┌─────────────────────┐
          │ EngineBackground │              │ viewportDom          │
          │ Layer            │              │ style.transform =    │
          │ (rAF → 写 SVG)   │              │ view.transform       │
          └─────────────────┘              └─────────────────────┘

                    ┌──────────────────────────────────┐
                    │ useEngineSelector (低频)          │
                    │ (visibleNodeIds → React render)   │
                    └──────────────────────────────────┘
```

---

## 2.8 与其他模块的关系

```
engineStore
    │
    ├──→ InfiniteMapEngine   (创建 + sync viewport)
    ├──→ EngineBackgroundLayer (subscribe view → 写 SVG pattern offset)
    ├──→ EngineDomNodesLayer  (subscribe visibleNodeIds → React render)
    ├──→ viewportDom          (subscribe view.transform → 直接写 style)
    ├──→ useWheelControls     (commitCamera → setView)
    ├──→ usePluginInputDispatch (pan gesture → commitCamera → setView)
    └──→ 所有 editor 插件      (ctx.getService('engine') 读取 store)
```

Engine Store 是连接"高频用户输入"和"高性能 DOM 更新"的桥梁。所有不经过 React 的渲染都通过它。
