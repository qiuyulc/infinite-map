# Editor 运行时（阶段 1）

> 这一页的目标：回答“插件是如何被装配起来的？一个插件如何影响输入/命令/overlay？”

核心文件：

- `packages/infinite-map/src/editor/runtime.ts`
- `packages/infinite-map/src/editor/types.ts`
- `packages/infinite-map/src/editor/composePlugins.ts`
- `packages/infinite-map/src/editor/createDefaultEditorPlugins.ts`

## 1. 插件的组成

`InfiniteMapPlugin` 的关键字段（精简）：

- `requires/provides`：声明依赖关系（用于排序/校验）
- `setup/teardown`：生命周期（注册 service / 写 store / 订阅 bus）
- `handlers`：输入处理（pointer/keyboard/wheel）
- `commands`：命令集合（id → run）
- `overlay`：React 组件（可选）
- `slot`：overlay 分层（background/overlay/hud）

## 2. MapContext 在 runtime 中的角色

runtime 会构造/维护 `ctx`，并把它传给：

- `handlers`（在输入事件中调用）
- `commands`（被 runCommand/快捷键/菜单触发）
- `overlay`（React 渲染）

因此：**ctx 是插件之间协作的契约**。

## 3. store / bus

- store：用于“状态共享”（selection ids、history stacks、minimap config…）
- bus：用于“事件通知”（selection:change、camera:changed…）

两者配合的常见模式：

1) 插件写 store（状态）  
2) 插件 emit bus（事件）  
3) 其他插件/overlay subscribe 后刷新 UI

