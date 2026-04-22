# 13. Milestone 3：Runtime 升级成“库级”版本（store / bus / commands / services / shortcuts）

Milestone 2 我们写了一个“最小插件系统”，能跑 selection + drag，但它有明显问题：

- 状态是散的（selectionIds 直接挂 ctx 方法）
- 事件是散的（没有统一通知机制）
- UI 触发行为会复制逻辑（没有 command）
- 能力实现不可替换（比如 camera/document 未来要做动画/协作时很痛）

Milestone 3 的目标是把它升级成**真正像三方库的架构**：

> **Plugin + Store + Bus + Command + Services**  
> 并且让快捷键、工具栏、右键菜单都能复用 command。

---

## 你将得到什么结果（先看目标）

1) 插件之间不再互相 import 调用，而是通过 `ctx.getService(...)` / `ctx.store` / `ctx.bus` 协作  
2) 右键菜单/工具栏/快捷键触发同一个 commandId（不重复写逻辑）  
3) selection/drag/resize/clipboard/history 等功能插件都能复用同一套底座  

---

## Step 0：新增/调整哪些文件？

这一步我们主要是在 `editor/` 里扩展“底座能力”：

```txt
packages/infinite-map/src/editor/
  types.ts            # MapContext/Plugin/Command 变得更完整
  runtime.ts          # 装配：services/commands/handlers/overlay slots
  keys.ts             # 统一 store keys

  # 新增两个基础设施（从0写时建议单独成文件）
  store.ts            # 极简 store（get/set/subscribe）
  bus.ts              # 极简 event bus（on/emit）

packages/infinite-map/src/editor/plugins/core/
  createCoreServicesPlugin.ts
  createCommandRunnerPlugin.ts
  createShortcutsPlugin.ts
  createViewCommandsPlugin.ts
```

> 注意：你现在仓库里这些文件已经存在。这章是“从0重写时的说明书”，不是让你改现有代码。

---

## Step 1：先把 store 写出来（最小 + 好用）

目标：插件共享状态时，不用 props 传来传去，也不用 React state。

最小接口：

```ts
type Store = {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  subscribe(key: string, cb: () => void): () => void
}
```

为什么 subscribe 要按 key？

- 避免任何 set 都触发全局刷新（性能会崩）
- 常见 HUD 只关心某几个 key（例如 history stacks、selection ids）

---

## Step 2：再把 bus 写出来（事件语义）

目标：表达“发生了什么”，让 HUD/插件可以订阅事件而不是乱 poll。

最小接口：

```ts
type Bus = {
  on(event: string, cb: (payload?: any) => void): () => void
  emit(event: string, payload?: any): void
}
```

store vs bus 的一句话区别：

- store：存“状态”
- bus：发“事件”

示例：

- selection ids 变化（状态）→ store.set('selection:ids', ids)
- selection 变更（事件）→ bus.emit('selection:change', { ids })

---

## Step 3：把 selectionIds 从 ctx 方法“迁移”到 store key

统一 key：

- `STORE_KEYS.selectionIds = 'selection:ids'`

selection 插件不再调用 `ctx.setSelectionIds`，而改成：

```ts
ctx.store.set(STORE_KEYS.selectionIds, ids)
ctx.bus.emit('selection:change', { ids })
```

HUD / overlay 想读取选中：

```ts
const ids = ctx.store.get<string[]>(STORE_KEYS.selectionIds) ?? []
```

这一步完成后，你会发现：

> 插件之间共享状态不再需要互相 import。

---

## Step 4：引入 services（可替换能力）

你会经常需要一些“全局能力”，例如：

- camera：设置/读取 camera（未来可带动画）
- selection：读取/设置 selection（未来可支持 group/lock）
- document：统一 applyPatches（未来可做协作/校验）

最小接口：

```ts
ctx.registerService('camera', cameraService)
ctx.getService('camera')
```

**为什么 services 是面试亮点？**

因为它体现“你考虑了可替换实现”，不会把实现写死在插件里。

---

## Step 5：引入 commands（让 UI 与行为解耦）

你要实现这样的效果：

- toolbar 点击“缩放+” → `view.zoomIn`
- 右键菜单点“置顶” → `z.bringToFront`
- Ctrl/Cmd+Z → `history.undo`

这些入口只做一件事：

```ts
ctx.runCommand('view.zoomIn', { source: 'toolbar' })
```

真正逻辑在命令实现里。

最小 command 类型：

```ts
type Command = {
  id: string
  title: string
  shortcut?: string
  run(ctx: MapContext, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api' }): void
}
```

---

## Step 6：CommandRunner（统一执行入口）

你需要一个地方维护命令注册表：

- 插件提供 `commands: Record<string, Command>`
- runtime 装配时把它们合并进 registry
- `ctx.runCommand` 通过 registry 找到并执行

这样 UI 永远不需要 import “具体实现插件”。

---

## Step 7：Shortcuts（快捷键只绑定 commandId）

快捷键插件要做：

1) 监听 keydown
2) 把快捷键映射到 commandId
3) 调用 `ctx.runCommand(commandId, { source: 'keyboard' })`

重点是：快捷键不关心命令实现在哪里。

---

## Step 8：把 view commands 做成“命令插件”

把 camera 相关行为统一为 view commands：

- `view.zoomIn/out/resetZoom`
- `view.fitView/centerView`
- `view.fitSelection/centerSelection`

每个命令都只改 camera（或基于 bbox 计算 camera）。

---

## 验证清单（你怎么证明 Milestone 3 成功了）

1) 快捷键触发命令：`Ctrl+Z` 能执行 `history.undo`（先 stub 也行）  
2) toolbar/menu/快捷键都能复用同一个 command  
3) selection 的 UI 能通过 store subscribe 刷新，而不是靠 prop 传递  
4) camera 变更时，minimap/zoomDock 通过 bus 事件同步（Milestone 4 验证）  

---

## 本章结束：你能讲出来的一句话（面试）

> 我把编辑器底座升级成库级架构：用 Store 管状态、Bus 管事件、Command 抽象动作、Services 提供可替换能力，实现了“多入口触发同一动作”的解耦，让 toolbar/菜单/快捷键都能复用逻辑，后续扩展新能力只需新增插件而不改核心组件。
