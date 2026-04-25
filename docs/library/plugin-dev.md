# 插件开发指南（Plugin Contract）

目标：让你能写出“可复用、可诊断、可组合”的插件，而不是把业务逻辑散落在各处。

> 核心心智：`InfiniteMap` 是 runtime；插件只做 **贡献能力**（hitTest/gesture/command/overlay），并通过 `store/bus/services` 与宿主对接。

---

## 1）插件最小结构

```ts
import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map'

export const myPlugin: InfiniteMapPlugin = {
  id: 'my-plugin',
  provides: ['my-capability'],
  requires: ['document', 'selection'],

  setup(ctx) {
    // 初始化、注册 service、订阅 bus 等
  },
  teardown() {
    // 清理订阅/计时器等
  },
}
```

### requires / provides
- `provides`：你提供的能力标签（供其它插件依赖）
- `requires`：你需要的能力标签（runtime 会排序并校验）

---

## 2）commands：对外可触发的“动作”

```ts
commands: {
  'edit.myAction': {
    id: 'edit.myAction',
    title: 'My Action',
    run: (ctx, payload) => { /* applyPatches / emit bus */ },
  }
}
```

建议：
- command 只做**纯动作**（计算 + patches）
- UI（按钮/菜单/快捷键）只是触发 command

---

## 3）document service：统一写入入口（推荐）

插件应尽量走 document service，而不是直接改 nodes：

```ts
const doc = ctx.getService<{ applyPatches: Function }>('document')
doc.applyPatches(patches, { source:'plugin', plugin:'my', reason:'xxx', phase:'end', ids })
```

好处：
- 统一进入 history（undo/redo）
- 宿主可通过 `onPatches` 做协作/持久化/审计

---

## 4）输入管线（Scheme C）

总体顺序：
1. `hitTests`：决定当前命中（node/handle/blank）
2. `pointerDownProcessors`：在 pointerdown 时“修正 hit / 改 selection / 阻断后续”
3. `gestures`：drag/resize/rotate/marquee 等持续交互

要点：
- selection 插件会把“有效命中”传给后续 gestures（例如：已选中 group 时点到组内节点，拖拽应拖整个 group）
- locked 节点允许被选中，但会阻断后续 gesture（便于解锁）

---

## 5）overlay：可选 UI 叠层

overlay 是 React 组件，适合做：
- selection 框/handles
- minimap/rulers/snap guides
- HUD（toolbar/context menu/zoom dock）

库内对 overlay 做了 ErrorBoundary：单个 overlay 报错不会拖垮整棵树，错误会通过 `onEditorError` 上报。

---

## 6）错误处理与诊断（强烈建议）

宿主可传：
- `onEditorError(err, info)`

其中 `info` 是结构化信息（kind/pluginId/gestureId/…）。

插件作者建议：
- 对外暴露稳定的 `id`
- 合理拆分 gestureId / processorId / hitTestId
- 避免在 render 里做副作用（overlay 只渲染）

