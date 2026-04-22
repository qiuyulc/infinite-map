# 03. 我如何修改一个功能？（示例：右键菜单）

这一章我们用最真实的方式学：**我点右键，到底是哪段代码在工作？**

## 你做了什么？

你在画布里右键（鼠标右键）。

## 第 1 步：谁接到了“右键事件”？

右键事件最终会变成一个“打开菜单”的状态。

相关文件（两段都要看）：

1) 右键菜单的“状态开关/坐标”：
   - `packages/infinite-map/src/editor/plugins/hud/createContextMenuPlugin.ts`

2) 右键菜单的“UI 长什么样/有哪些项”：
   - `packages/infinite-map/src/editor/plugins/hud/createDefaultContextMenuPlugin.tsx`

## 第 2 步：菜单位置为什么不会跑出容器？

在 `createDefaultContextMenuPlugin.tsx` 里你会看到：

- 用 `payload.screen.x/y` 得到鼠标位置
- 再把它换算成“容器内坐标”
- 最后做 clamp（限制范围），保证菜单不会超过父容器边界

你可以把它理解成：

> “鼠标在这里点开菜单 → 但是菜单不能超出画布，所以要把位置限制住”

## 第 3 步：菜单项点了以后做什么？

菜单项一般会触发一个命令 id（例如复制/粘贴/置顶/缩放）。

你会看到类似：

- `ctx.runCommand('edit.copy')`

这意味着：

> 右键菜单只负责 UI，真正的动作在 command 里

对应命令实现的位置（举例）：

- 缩放相关：`packages/infinite-map/src/editor/plugins/core/createViewCommandsPlugin.ts`
- zIndex 相关：`packages/infinite-map/src/editor/plugins/core/createZIndexPlugin.ts`
- 剪贴板相关：`packages/infinite-map/src/editor/plugins/clipboard/createClipboardPlugin.ts`

---

## 你现在如何“改右键菜单”？

你想改什么，就去改对应文件：

1) 改菜单的文案/icon/顺序：
   - `createDefaultContextMenuPlugin.tsx`

2) 改“右键触发时机/坐标来源/什么时候关闭”：
   - `createContextMenuPlugin.ts`

3) 改“点了以后实际做什么”：
   - 去改对应 command/plugin（上面列了常见的几个）

这就是插件化的好处：你不会在 InfiniteMap.tsx 里迷路。

