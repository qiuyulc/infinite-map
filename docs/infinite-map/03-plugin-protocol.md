# 3. 插件协议

> 涉及的源文件：`editor/types.ts`、`editor/runtime.ts`、`editor/keys.ts`
>
> 插件协议定义了 infinite-map 的扩展体系——所有 editor 包的功能都是通过这个协议接入的。

---

## 3.1 协议全景

```
                    ┌─────────────────────────────────┐
                    │       InfiniteMapPlugin          │
                    │  (插件定义，editor 包实现)         │
                    ├─────────────────────────────────┤
                    │ id / provides / requires / order │ ← 身份 & 依赖
                    │ setup / teardown                 │ ← 生命周期
                    │ input (wheel/key/contextmenu)    │ ← 非指针输入
                    │ hitTests                         │ ← 命中检测
                    │ pointerDownProcessors            │ ← 非互斥逻辑
                    │ gestures                         │ ← 互斥手势
                    │ inputHooks                       │ ← 管线钩子
                    │ overlay + slot                   │ ← UI 渲染
                    │ commands                         │ ← 命令注册
                    └─────────────────────────────────┘
```

一个插件可以同时拥有以上任意组合的能力。例如 `createSelectionPlugin` 同时提供 hitTest、pointerDownProcessor 和 overlay。

---

## 3.2 插件身份 & 依赖

```ts
type InfiniteMapPlugin = {
  id: string;                    // 全局唯一标识
  enabled?: boolean;             // 是否启用（默认 true）
  priority?: number;             // 排序优先级（越大越靠前）
  provides?: string[];           // 提供的能力（默认包含自身 id）
  requires?: string[];           // 依赖的能力/插件 id
  order?: {
    before?: string[];           // 必须在这些插件之前
    after?: string[];            // 必须在这些插件之后
  };
  // ...
};
```

**为什么需要依赖声明？**

clipboard 插件依赖 selection（复制需要知道当前选中了哪些节点）和 history（粘贴需要产生可撤销的操作）。如果用户忘记加载 selection 插件，`composePlugins` 会在启动时抛错，而不是运行时静默失败。

**排序规则：**
1. `requires` 依赖 → provider 必须在 consumer 之前
2. `order.before` / `order.after` → 显式顺序
3. 同层按 `priority` 降序

---

## 3.3 输入管线 (Scheme C)

这是整个项目的交互核心。一次 pointer down 事件的处理流程：

```
  pointer down
       │
       ▼
  ┌──────────────┐
  │  inputHooks   │  onBeforeHitTest (所有插件)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   hitTests    │  按优先级依次尝试命中检测
  │  (各插件贡献) │  第一个返回非 null 的获胜
  └──────┬───────┘
         │ hit = { kind:'node', id:'xxx' }
         ▼        或 { kind:'handle', ... }
                  或 { kind:'blank' }
  ┌──────────────┐
  │  inputHooks   │  onAfterHitTest
  └──────┬───────┘
         │
         ▼
  ┌──────────────────────┐
  │ pointerDownProcessors │  非互斥逻辑（如 selection）
  │                      │  可返回 { stop:true } 阻断后续 gesture
  │                      │  可返回 { hit } 修改有效命中
  └──────┬───────────────┘
         │
         ▼
  ┌──────────────┐
  │   gestures    │  按优先级尝试启动
  │  (互斥，同时   │  canStart → onStart
  │   只有一个     │
  │   活跃)       │
  └──────┬───────┘
         │
    ┌────┴────┐
    │  move   │  每次 pointermove → active gesture.onMove
    │   up    │  pointerup      → active gesture.onEnd / onCancel
    └─────────┘
```

**关键设计：gesture 是互斥的，processor 不是。**

- gesture：同一时刻只有一个活跃（drag 和 pan 不能同时进行）
- processor：每次都执行（selection 改变不应该阻止 drag 启动）

---

## 3.4 HitTestTarget — 命中结果

```ts
type HitTestTarget =
  | { kind: 'blank'; cursor?: string }                         // 命中空白区域
  | { kind: 'node'; id: string; cursor?: string }               // 命中节点
  | { kind: 'handle'; owner: string; id: string; handle: string }; // 命中缩放手柄
```

手柄命中需要额外的 `owner`（哪个插件提供的）和 `handle`（n/s/e/w/ne/nw/se/sw 或 rotate）。

---

## 3.5 PointerDownProcessor — 非互斥逻辑

```ts
type PointerDownProcessor = {
  id: string;
  priority?: number;
  onPointerDown: (
    e: MapPointerEvent,
    ctx: MapContext,
    hit: HitTestTarget
  ) => void | { stop?: boolean; hit?: HitTestTarget };
};
```

**典型用例：selection**

```ts
// createSelectionPlugin 的 processor
onPointerDown: (e, ctx, hit) => {
  if (hit.kind === 'blank') {
    // 点击空白 → 清空选择
    ctx.store.set('selection:ids', []);
    return;  // 不阻止后续 gesture（允许 pan）
  }
  if (hit.kind === 'node') {
    // 更新选择
    ctx.store.set('selection:ids', [hit.id]);
  }
  // 锁定节点：允许选中但阻止拖动
  if (isLocked(hit.id)) {
    return { stop: true };  // 阻断后续 gesture
  }
};
```

**关键语义：**
- 返回 `void` 或不返回 → 不影响后续 gesture
- 返回 `{ stop: true }` → 阻断所有后续 gesture（锁定节点不可拖动）
- 返回 `{ hit: newHit }` → 修改有效命中（子节点提升为 group）

---

## 3.6 Gesture — 互斥手势

```ts
type Gesture = {
  id: string;
  priority?: number;
  canStart:  (e, ctx, hit) => boolean;  // 是否可以启动
  onStart:   (e, ctx, hit) => void;      // 启动
  onMove:    (e, ctx) => void;           // 移动
  onEnd:     (e, ctx) => void;           // 结束
  onCancel:  (e, ctx) => void;           // 取消（如焦点丢失）
};
```

**典型用例：drag**

```ts
// createDragPlugin 的 gesture
{
  id: 'drag',
  priority: 100,
  canStart: (e, ctx, hit) => {
    if (e.button !== 0) return false;        // 只响应左键
    if (isSpaceMode(ctx)) return false;       // Space 模式不抢
    if (hit.kind !== 'node') return false;    // 必须命中节点
    if (isLocked(hit.id)) return false;       // 锁定节点不可拖动
    return true;
  },
  onStart: (e, ctx, hit) => {
    // 记录起始位置、选中节点列表
    startDrag(e, ctx, hit.id);
  },
  onMove: (e, ctx) => {
    // 计算偏移、吸附、更新 DOM transform
    updateDrag(e, ctx);
  },
  onEnd: (e, ctx) => {
    // 提交 patches、恢复 DOM transform
    endDrag(e, ctx);
  },
}
```

**内置 pan gesture（最低优先级 -9999）：** 当没有其他 gesture 匹配时，空白拖拽触发画布平移。

---

## 3.7 MapContext — 插件运行时上下文

```ts
type MapContext = {
  // 只读数据（通过 getter 读 ref，永远是最新值）
  getCamera(): Camera;
  getViewport(): { w: number; h: number };
  getNodes(): NodeData[];
  getVisibleNodes(): NodeData[];

  // 坐标变换
  screenToWorld(p: Point): Point;
  worldToScreen(p: Point): Point;

  // 数据变更出口
  applyPatches(patches: NodePatch[], meta: ChangeMeta): void;

  // 协作机制
  bus: EventBus;    // 事件总线
  store: Store;     // 共享状态（key-value）

  // 服务容器（插件通过 service 暴露能力给其他插件）
  registerService<T>(name: string, service: T): void;
  getService<T>(name: string): T | undefined;

  // 其他
  runCommand?(id: string, payload?): void;
  requestRender(): void;
};
```

**为什么用 getter 而不是直接给值？**

```ts
getCamera: () => cameraRef.current  // 读 ref，永远是最新的
```

如果在 `setup` 时就捕获 camera 值，后续 camera 变化不会反映到插件中。用 getter 包装 ref 是 React 中传递"可变但不需要触发重渲染"的数据的标准模式。

---

## 3.8 Patch 系统

```ts
type NodePatch =
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'set';  id: string; data: Partial<NodeData> }
  | { type: 'add';  node: NodeData }
  | { type: 'remove'; id: string };

type ChangeMeta = {
  source: 'plugin';       // 来源类型（固定为 plugin）
  plugin: string;         // 产生变更的插件 id
  reason: 'drag' | 'click-select' | 'delete' | 'paste' | ...;
  phase?: 'start' | 'move' | 'end';  // 阶段标记
  ids?: string[];         // 涉及的节点 id
};
```

**Patch 是编辑器的"通用语言"。** 所有编辑操作（拖拽、缩放、删除、粘贴、undo/redo）都产生 Patch，业务侧通过 `onNodesChange` 或 `onPatches` 接收。

**Phase 标记的作用：**
- `move`：中间状态，Patch 引擎会 rAF 合并
- `end`：最终状态，触发历史记录
- 无 phase：一次性操作（add/remove），直接触发历史记录

---

## 3.9 运行时工具

### EventBus

```ts
type EventBus = {
  on<K>(type: K, handler: (payload: EventMap[K]) => void): () => void;
  emit<K>(type: K, payload: EventMap[K]): void;
};
```

预定义事件：`camera:changed`、`selection:change`、`drag:start/move/end`、`patches:applied`、`history:undo/redo`、`hover:change`、`export:png`。

### Store

```ts
type Store = {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  subscribe(key: string, listener: () => void): () => void;
};
```

是 Map + 观察者的简单封装。所有 `STORE_KEYS` 都是通过这个 store 共享的。

### STORE_KEYS

集中管理所有跨插件共享的 store key：

```
editEnabled           ← 是否允许编辑
viewPanEnabled        ← 是否允许平移
selectionIds          ← 当前选中节点
dragState             ← 拖拽状态
snapConfig            ← 吸附配置
clipboardData         ← 剪贴板数据
historyUndoStack      ← undo 栈
...
```

---

## 3.10 服务容器

```ts
ctx.registerService('selection', {
  getIds: () => ctx.store.get<string[]>('selection:ids') ?? [],
  setIds: (ids) => { ... },
  clear: () => { ... },
});

// 其他插件读取
const sel = ctx.getService<SelectionService>('selection');
sel?.getIds();
```

服务容器让插件之间可以通过接口通信，而不需要知道彼此的具体实现。例如 clipboard 插件调用 selection 服务的 `getIds()` 获取当前选中节点，不需要知道 selection 的内部实现细节。
