# 命令与快捷键（阶段 1）

## 1. 为什么用 Command？

Command 的意义是把“业务动作”抽象成稳定 id：

- UI（toolbar / context menu / zoom dock）触发的是 commandId
- 快捷键触发的是 commandId
- 插件内部也可以触发 commandId

这样 UI 与实现解耦，扩展/替换更容易。

## 2. View 命令（示例）

来源：`packages/infinite-map/src/editor/plugins/core/createViewCommandsPlugin.ts`

- `view.zoomIn` / `view.zoomOut` / `view.resetZoom`
- `view.fitView` / `view.centerView`
- `view.fitSelection` / `view.centerSelection`

## 3. ZIndex 命令（示例）

来源：`packages/infinite-map/src/editor/plugins/core/createZIndexPlugin.ts`

- `z.bringToFront` / `z.sendToBack`
- `z.bringForward` / `z.sendBackward`

## 4. Shortcut 绑定（现状）

来源：`packages/infinite-map/src/editor/plugins/core/createShortcutsPlugin.ts`

- 默认快捷键绑定写在 command 上（或由 shortcuts plugin 注册）
- `createDefaultEditorPlugins({ shortcutOverrides })` 允许覆盖/禁用

