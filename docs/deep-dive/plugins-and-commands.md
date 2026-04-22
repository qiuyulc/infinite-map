# 插件与命令系统：为什么要这样写（从扩展性出发）

你现在觉得“代码乱/看不懂”，通常不是因为某个函数太复杂，而是因为**协作机制没被显式总结**：插件怎么协作、状态怎么共享、命令怎么复用。

这一页用“你要新增功能”这个视角来解释：为什么项目会选择 `Plugin + Command + Store + Bus + Services` 这套结构。

## 1) 为什么一定要插件化？

如果所有交互都写在 `InfiniteMap.tsx` 里，会出现几个问题：

- 每加一个能力（框选/吸附/右键/缩放条）就往一个文件堆逻辑
- 能力之间会互相抢输入事件（谁先处理 pointermove？）
- UI 叠层混乱（谁在最上层？谁应该吃事件？）

插件化的核心收益是：

- **按领域分包**：selection / transform / snapping / hud …
- **按优先级组合**：输入处理有顺序、overlay 有 slot
- **按需启用**：用户可以只要 core + selection，也可以全套

入口：

- `packages/infinite-map/src/editor/createDefaultEditorPlugins.ts`

## 2) 为什么 Command 是“一等公民”？

命令是“语义层”：

- toolbar 触发 `view.zoomIn`
- 右键菜单触发 `edit.copy`
- 快捷键触发 `history.undo`

但它们最终都调用同一个 command implementation。

这样做的关键收益：

- UI 与实现解耦（你以后可以替换 UI，不动核心）
- 多入口复用（按钮/菜单/快捷键/外部 API）
- 更利于扩展：业务只需要注册一个新 commandId，就能被菜单/快捷键消费

相关文件：

- `packages/infinite-map/src/editor/types.ts`：`Command` 类型
- `packages/infinite-map/src/editor/plugins/core/createCommandRunnerPlugin.ts`
- `packages/infinite-map/src/editor/plugins/core/createShortcutsPlugin.ts`

## 3) 为什么需要 Store（而不是全靠 React state）？

Editor 插件不是 React 组件树的一部分，它们需要共享状态：

- selection ids
- history stacks
- minimap config / needsRedraw
- view config

如果用 React state，会遇到：

- 插件与组件跨层传参复杂
- 性能不稳定（频繁 setState 触发大面积渲染）

Store 的定位是“编辑器内部状态仓库”，所有插件都通过统一 key 来读写：

- `packages/infinite-map/src/editor/keys.ts`

## 4) 为什么需要 Bus？

Bus 解决的是“通知”问题：

- selection 改了 → overlay/UI 刷新
- camera 改了 → minimap/zoomDock 同步

相比 store subscribe，bus 更适合表达“事件语义”。

常见模式：

1) 写 store（状态落地）
2) emit bus（通知）
3) 其他插件/UI subscribe 刷新

## 5) 为什么还要 Services？

Services 是“能力注入”的方式：

- `camera` service：统一设置 camera（可以以后替换成带动画的实现）
- `selection` service：统一读取选中
- `document` service：统一 applyPatches（可插入校验、协作、版本）

使用方式：

- `ctx.registerService('camera', ...)`
- `ctx.getService('camera')`

这样插件之间不需要互相 import，降低耦合。

## 6) 我想加一个新功能，该怎么落地（建议模板）

以“加一个 HUD 面板”为例：

1) 新建 `src/editor/plugins/hud/createXxxPlugin.tsx`
2) `slot: 'hud'`，`overlayPointerEvents: 'auto'`
3) 需要全局状态 → 在 store 定义 key（`editor/keys.ts`）
4) 需要可复用动作 → 注册 command（而不是直接在 UI 里写逻辑）
5) 需要对外注入能力 → register service（可选）

这样写出来的功能最不“业务”，也最容易被复用。

