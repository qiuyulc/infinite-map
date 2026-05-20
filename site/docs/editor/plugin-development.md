# 插件开发指南

本文档教你如何为 Infinite Map 编写自定义编辑器插件。

---

## 插件是什么

插件是实现 `InfiniteMapPlugin` 接口的普通对象。每个插件负责一种编辑能力（如选择、拖拽、历史记录），通过统一的协议接入画布运行时。

核心价值：

- **可组合**：多个插件可以堆叠，`composePlugins()` 自动处理依赖和顺序
- **可开关**：通过 `enabled` 字段按需启用/禁用
- **不侵入内核**：所有编辑能力都实现在插件层，core 包保持不变

---

## 最小插件

```ts
import type { InfiniteMapPlugin } from "@qiuyulc/infinite-map";

const myPlugin: InfiniteMapPlugin = {
  id: "my-plugin",
  setup: (ctx) => {
    console.log("插件已挂载，当前节点数:", ctx.getNodes().length);
  },
  teardown: () => {
    console.log("插件已卸载");
  },
};
```

这就是一个合法的最小插件。它只有生命周期钩子，不参与任何交互。

---

## 插件接口全览

```ts
type InfiniteMapPlugin = {
  // ---- 元信息 ----
  id: string;
  enabled?: boolean;
  priority?: number;
  provides?: string[];
  requires?: string[];
  order?: { before?: string[]; after?: string[] };

  // ---- 生命周期 ----
  setup?: (ctx: MapContext) => void;
  teardown?: () => void;

  // ---- 非指针输入 ----
  input?: InputHandlers;

  // ---- 指针输入管线 ----
  hitTests?: HitTestContributor[];
  pointerDownProcessors?: PointerDownProcessor[];
  gestures?: Gesture[];
  inputHooks?: InputPipelineHooks;

  // ---- 视觉输出 ----
  overlay?: OverlayComponent;
  slot?: "background" | "overlay" | "hud";
  overlayPointerEvents?: "none" | "auto";

  // ---- 命令 ----
  commands?: Record<string, Command>;
};
```

下面按功能域逐一讲解。

---

## 1. 元信息与依赖声明

```ts
{
  id: 'my-drag',
  priority: 100,       // 数字越大越靠前
  provides: ['drag'],  // 声明自己提供的能力
  requires: ['selection', 'commands'],  // 声明依赖的能力或插件
  order: { before: ['resize'], after: ['selection'] },  // 显式排序
}
```

- `provides`：默认包含自身 `id`，可以扩展声明额外的能力名
- `requires`：被依赖的插件必须存在（可以是插件 `id` 或能力名），否则 `composePlugins()` 抛错
- `order`：显式指定前后关系，优先级低于 `requires`（依赖关系最优先）
- `priority`：同层级内排序，数字大的在前

---

## 2. 生命周期

```ts
{
  setup: (ctx) => {
    // 插件挂载时调用一次
    // 在这里：初始化 store、注册 service、订阅事件总线
    const unsub = ctx.bus.on('selection:change', ({ ids }) => {
      console.log('选中变化:', ids);
    });
  },
  teardown: () => {
    // 插件卸载时调用一次
    // 在这里：解绑事件、清理 store、释放资源
  },
}
```

`setup` 中可以安全地：

- 读写 `ctx.store`
- 注册 `ctx.registerService(name, service)`
- 订阅 `ctx.bus.on(event, handler)`
- 读 `ctx.getNodes()`、`ctx.getCamera()` 等

**注意**：`setup` 中不应调用 `ctx.applyPatches()` —— 那是命令/手势的责任。

---

## 3. 非指针输入

```ts
{
  input: {
    onWheel: (e, ctx) => {
      // 处理滚轮事件
      return { handled: true };  // 阻止默认行为
    },
    onKeyDown: (e, ctx) => {
      if (e.code === 'Space') {
        ctx.store.set('space:pressed', true);
        return { handled: true };
      }
      return { handled: false };
    },
    onKeyUp: (e, ctx) => {
      if (e.code === 'Space') {
        ctx.store.set('space:pressed', false);
        return { handled: true };
      }
      return { handled: false };
    },
    onContextMenu: (e, ctx, hit) => {
      // 处理右键菜单
      return { handled: false };
    },
  },
}
```

返回值 `{ handled: true }` 会阻止事件的默认行为和后续处理。

---

## 4. 指针输入管线（核心）

指针（鼠标/触控）输入走一个统一的管线：

```
Raw Pointer Event
  → hitTests（命中检测）→ 确定指针命中了什么
  → pointerDownProcessors（非互斥预处理）→ selection 等逻辑
  → gestures（互斥手势）→ drag / resize / rotate / marquee / pan
```

### 4.1 HitTestContributor（命中检测）

```ts
{
  hitTests: [
    {
      id: 'node-hit',
      priority: 100,
      hitTest: (e, ctx, info) => {
        // info.kind === 'pointer' | 'contextmenu'
        const node = ctx.queryNodesInWorldRect({
          x: e.world.x, y: e.world.y, w: 1, h: 1,
        })[0];
        if (node) {
          return { kind: 'node', id: node.id };
        }
        return null;  // 不处理，交给下一个 contributor
      },
    },
  ],
}
```

返回 `null` 表示"不处理"，由下一个 contributor 竞争。多个 contributor 按 `priority` 降序执行，**第一个非 null 结果获胜**。

### 4.2 PointerDownProcessor（非互斥预处理）

```ts
{
  pointerDownProcessors: [
    {
      id: 'selection-processor',
      priority: 50,
      onPointerDown: (e, ctx, hit) => {
        if (hit.kind === 'node') {
          ctx.store.set('selection:ids', [hit.id]);
          ctx.requestRender();
        }
        // 不返回任何值 = 不影响后续 gesture
        // 返回 { stop: true } = 阻止后续 gesture 启动
        // 返回 { hit: newHit } = 修改本次有效命中
      },
    },
  ],
}
```

### 4.3 Gesture（互斥手势）

最复杂的插件类型。一个 Gesture 有五个回调：

```ts
{
  gestures: [
    {
      id: 'my-drag',
      priority: 100,
      canStart: (e, ctx, hit) => {
        // 判断是否可以启动此手势
        // 返回 false 则跳过，交给下一个 gesture
        return e.button === 0 && hit.kind === 'node';
      },
      onStart: (e, ctx, hit) => {
        // 手势开始：保存初始状态
        ctx.store.set('my-drag:state', {
          id: hit.kind === 'node' ? hit.id : '',
          startX: e.world.x,
          startY: e.world.y,
        });
      },
      onMove: (e, ctx) => {
        // 每帧移动：计算偏移，更新状态
        const state = ctx.store.get('my-drag:state');
        if (!state) return;
        // ...
        ctx.requestRender();
      },
      onEnd: (e, ctx) => {
        // 手势结束：提交最终变更
        const state = ctx.store.get('my-drag:state');
        if (!state) return;
        ctx.applyPatches(
          [{ type: 'move', id: state.id, x: finalX, y: finalY }],
          { source: 'plugin', plugin: 'my-drag', reason: 'drag', phase: 'end' },
        );
        ctx.store.set('my-drag:state', null);
        ctx.requestRender();
      },
      onCancel: (e, ctx) => {
        // 手势被取消（如按 Escape、切换窗口）
        ctx.store.set('my-drag:state', null);
        ctx.requestRender();
      },
    },
  ],
}
```

**关键约定**：

- `onMove` 期间建议用 `phase: 'move'` 提交 patch（走 DOM 直写性能路径）
- `onEnd` 时用 `phase: 'end'` 提交最终 patch
- 不同 phase 的 patch 会被 history 插件自动合并为一条 undo 记录

### 4.4 InputPipelineHooks（输入管线钩子）

```ts
{
  inputHooks: {
    onBeforeHitTest: (e, ctx, info) => {
      // 在 hitTest 之前执行（用于记录鼠标位置等）
    },
    onAfterHitTest: (hit, e, ctx, info) => {
      // 在 hitTest 之后执行（用于 hover 检测等）
    },
    onHoverChange: ({ prev, next, e }, ctx) => {
      // hover 目标变化时触发
    },
    onBeforeGesture: ({ phase, gestureId, hit, e }, ctx) => {
      // 手势启动前
    },
    onAfterGesture: ({ phase, gestureId, hit, e }, ctx) => {
      // 手势结束后
    },
  },
}
```

---

## 5. 视觉输出：Overlay

```tsx
import type { OverlayComponent } from "@qiuyulc/infinite-map";

const MyOverlay: OverlayComponent = ({ ctx }) => {
  const camera = ctx.getCamera();
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      Zoom: {camera.zoom.toFixed(2)}
    </div>
  );
};

const myPlugin: InfiniteMapPlugin = {
  id: "my-info-panel",
  slot: "hud",
  overlay: MyOverlay,
};
```

slot 决定了渲染层级：

- `'background'`：节点层之下（用于背景效果）
- `'overlay'`：节点层之上（用于选择框/对齐线等编辑辅助）
- `'hud'`：最上层（用于面板/工具栏/小地图等 UI）

`overlayPointerEvents: 'auto'` 时 overlay 可以接收鼠标事件（如 resize handle 需要点击）。

---

## 6. 命令

```ts
{
  commands: {
    'my-plugin.doSomething': {
      id: 'my-plugin.doSomething',
      title: 'Do Something',
      shortcut: 'Mod+K',  // 可选：默认快捷键
      run: (ctx, payload) => {
        // 执行命令逻辑
        ctx.applyPatches(
          [{ type: 'add', node: { id: 'new', x: 0, y: 0, width: 100, height: 100 } }],
          { source: 'plugin', plugin: 'my-plugin', reason: 'import' },
        );
      },
    },
  },
}
```

命令可以被多种方式触发：

- 快捷键（由 `shortcuts` 插件映射）
- 工具栏按钮（通过 `hud` service 注册）
- 右键菜单（通过 context menu service）
- 程序调用：`ctx.runCommand('my-plugin.doSomething')`
- API：`apiRef.current.runCommand('my-plugin.doSomething')`

---

## 7. Service 模式（跨插件协作）

一个插件可以向 `ctx.services` 注册服务，供其他插件读取：

```ts
// provider 插件
{
  id: 'my-service-provider',
  provides: ['my-service'],
  setup: (ctx) => {
    ctx.registerService('my-service', {
      getData: () => someSharedState,
      doWork: (arg: string) => { /* ... */ },
    });
  },
}

// consumer 插件
{
  id: 'my-service-consumer',
  requires: ['my-service'],
  setup: (ctx) => {
    const svc = ctx.getService<{ getData: () => unknown }>('my-service');
    if (svc) {
      console.log(svc.getData());
    }
  },
}
```

内置 service 示例：

- `'camera'`：相机驱动服务（core 层注册）
- `'document'`：统一 patches 入口
- `'hud'`：Toolbar / ContextMenu 的贡献注册表
- `'group'`：编组操作（`expandIds` 等）
- `'selection'`：选择操作
- `'dom-nodes'`：DOM 节点引用（用于 Engine 模式直写）
- `'engine'`：引擎内部 store 和 cameraRef

---

## 8. Store 约定（跨插件共享状态）

使用 `STORE_KEYS` 常量避免散落的字符串字面量：

```ts
import { STORE_KEYS } from "@qiuyulc/infinite-map";

// 读取选中
const ids = ctx.store.get<string[]>(STORE_KEYS.selectionIds);

// 写入吸附引导线
ctx.store.set(STORE_KEYS.snapGuides, [{ axis: "x", value: 100 }]);

// 订阅变化
ctx.store.subscribe(STORE_KEYS.snapGuides, () => {
  ctx.requestRender();
});
```

关键 Store Key：

| Key                 | 用途                   |
| ------------------- | ---------------------- |
| `selection:ids`     | 当前选中的节点 ID 列表 |
| `keyboard:space`    | Space 键是否按下       |
| `drag:state`        | 拖拽手势状态           |
| `resize:state`      | 缩放手势状态           |
| `snap:config`       | 吸附配置               |
| `snap:guides`       | 当前吸附引导线         |
| `history:undoStack` | 撤销栈                 |
| `history:redoStack` | 重做栈                 |
| `clipboard:data`    | 剪贴板数据             |
| `toolbar:items`     | 工具栏贡献项           |
| `contextmenu:items` | 右键菜单贡献项         |

完整列表见 `packages/infinite-map/src/editor/keys.ts`。

---

## 9. 事件总线

```ts
// 发布
ctx.bus.emit("selection:change", { ids: ["1", "2"] });

// 订阅
const unsub = ctx.bus.on("selection:change", ({ ids }) => {
  console.log("选中变化:", ids);
});
// 卸载时解绑
// unsub();
```

主要事件：

| 事件                                    | 用途                                 |
| --------------------------------------- | ------------------------------------ |
| `selection:change`                      | 选中变化                             |
| `drag:start` / `drag:move` / `drag:end` | 拖拽生命周期                         |
| `hover:change`                          | hover 目标变化                       |
| `patches:applied`                       | patches 已应用（history 监听此事件） |
| `command:run`                           | 命令已执行                           |
| `camera:set` / `camera:changed`         | 相机变更                             |
| `history:undo` / `history:redo`         | 撤销/重做                            |
| `export:png`                            | 导出 PNG 请求                        |

---

## 10. 完整插件模板

```ts
import type {
  InfiniteMapPlugin,
  MapContext,
  Gesture,
  HitTestContributor,
  PointerDownProcessor,
  Command,
} from "@qiuyulc/infinite-map";
import { STORE_KEYS } from "@qiuyulc/infinite-map";

// ---- 类型 ----
type MyPluginOptions = {
  threshold?: number;
};

type MyGestureState = {
  pointerId: number;
  primaryId: string;
  startWorld: { x: number; y: number };
};

// ---- 工厂函数 ----
export function createMyPlugin(opts: MyPluginOptions = {}): InfiniteMapPlugin {
  const threshold = opts.threshold ?? 10;

  return {
    // 元信息
    id: "my-plugin",
    priority: 50,
    provides: ["myCapability"],
    requires: ["commands", "selection"],
    order: { after: ["selection"], before: ["drag"] },

    // 生命周期
    setup: (ctx) => {
      ctx.store.set("my:data", { initialized: true });

      ctx.bus.on("selection:change", ({ ids }) => {
        if (ids.length > 0) {
          ctx.store.set("my:lastSelection", ids);
        }
      });
    },
    teardown: () => {
      // 清理（ctx.store 的 listener 由 core 自动清理）
    },

    // 非指针输入
    input: {
      onKeyDown: (e, ctx) => {
        if (e.code === "KeyM" && e.modifiers.ctrl) {
          ctx.runCommand?.("my-plugin.action");
          return { handled: true };
        }
        return { handled: false };
      },
    },

    // 命中检测
    hitTests: [
      {
        id: "my-hit",
        priority: 100,
        hitTest: (e, ctx) => {
          const nodes = ctx.queryNodesInWorldRect({
            x: e.world.x - 5,
            y: e.world.y - 5,
            w: 10,
            h: 10,
          });
          if (nodes.length > 0) {
            return {
              kind: "handle",
              owner: nodes[0].id,
              id: "my-handle",
              handle: "my",
            };
          }
          return null;
        },
      } satisfies HitTestContributor,
    ],

    // 指针预处理
    pointerDownProcessors: [
      {
        id: "my-processor",
        priority: 10,
        onPointerDown: (e, ctx, hit) => {
          if (hit.kind === "handle" && hit.handle === "my") {
            // 做一些事，不阻断手势
          }
        },
      } satisfies PointerDownProcessor,
    ],

    // 手势
    gestures: [
      {
        id: "my-gesture",
        priority: 100,
        canStart: (e, ctx, hit) => {
          return e.button === 0 && hit.kind === "handle" && hit.handle === "my";
        },
        onStart: (e, ctx, hit) => {
          const st: MyGestureState = {
            pointerId: e.pointerId,
            primaryId: hit.kind === "handle" ? hit.owner : "",
            startWorld: { x: e.world.x, y: e.world.y },
          };
          ctx.store.set("my:gestureState", st);
        },
        onMove: (e, ctx) => {
          const st = ctx.store.get<MyGestureState>("my:gestureState");
          if (!st || st.pointerId !== e.pointerId) return;
          // 计算并提交 patch
          ctx.requestRender();
        },
        onEnd: (e, ctx) => {
          const st = ctx.store.get<MyGestureState>("my:gestureState");
          if (!st || st.pointerId !== e.pointerId) return;
          ctx.applyPatches([], {
            source: "plugin",
            plugin: "my-plugin",
            reason: "drag",
            phase: "end",
          });
          ctx.store.set("my:gestureState", null);
          ctx.requestRender();
        },
        onCancel: (e, ctx) => {
          ctx.store.set("my:gestureState", null);
          ctx.requestRender();
        },
      } satisfies Gesture,
    ],

    // 输入钩子
    inputHooks: {
      onBeforeHitTest: (e, ctx) => {
        ctx.store.set("my:lastPointerScreen", e.screen);
      },
    },

    // 命令
    commands: {
      "my-plugin.action": {
        id: "my-plugin.action",
        title: "My Action",
        shortcut: "Mod+M",
        run: (ctx, payload) => {
          const source = payload?.source ?? "api";
          ctx.applyPatches([], {
            source: "plugin",
            plugin: "my-plugin",
            reason: "keyboard",
          });
        },
      } satisfies Command,
    },
  };
}
```

---

## 11. 最佳实践

1. **一个插件一个职责**。不要把 drag 和 clipboard 写在一个插件里。

2. **用 `STORE_KEYS` 而不是字符串字面量**。避免拼写错误，方便 IDE 跳转。

3. **Gesture 中 `onMove` 不要调 `applyPatches` 传 `phase: 'start'` 或 `phase: 'end'`**。全程用 `phase: 'move'`，让 history 插件正确合并。

4. **声明 `requires` 而非依赖隐式顺序**。`requires` 会被 `composePlugins` 校验，顺序依赖不会被校验。

5. **提供 TypeScript 类型导出**。每个插件工厂的 Options 类型应该从包入口导出，方便使用者配置。

6. **`teardown` 中清理 `ctx.store` 写入的状态**。避免热更新时残留脏数据。

7. **`requestRender()` 仅在需要重绘 overlay 时调用**。不要在每帧都调——仅在状态变化后调一次。

---

## 下一步

- [插件 API 参考](/editor/plugin-reference) — 所有内置插件的详细说明
- [编辑器定制](/editor/customization) — 扩展工具栏/右键菜单
- [架构总览](/editor/overview) — 理解 editor 包的整体设计
