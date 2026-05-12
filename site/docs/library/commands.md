# 命令速查表（Command IDs）

命令是“可被 UI / 快捷键 / API 统一触发的动作”。默认编辑器插件会注册大量命令到 registry。

触发方式：
- 宿主：`apiRef.current?.runCommand?.(id, { source: 'api' })`
- 或：`ctx.runCommand(id, { source })` / `ctx.bus.emit('command:run', { id, source })`

> 快捷键默认由 `createShortcutsPlugin()` 提供（可通过 `commandShortcuts` 覆盖/禁用）。
>
> 说明：`Mod` 表示 `Ctrl`（Windows/Linux）或 `⌘`（macOS）。

---

## 交互快捷键（非命令）

这类快捷键不是 “command”，但属于默认编辑器交互的一部分：

| 操作 | 快捷键 | 说明 |
|---|---|---|
| 画布平移模式 | `Space`（按住） | 按住空格时拖拽=平移画布（selection/drag 等不会抢输入） |
| 多选 | `Shift` | 点击切换选中；框选可配 `requireShift` |
| 3D 旋转 | `Alt/Option + 拖拽` | 单选命中节点后，拖拽改变 `rotationX/rotationY` |
| 键盘微调（nudge） | `↑ ↓ ← →` | 对选中节点做像素级移动（默认 1px） |
| 大步微调 | `Shift + ↑ ↓ ← →` | 更大步长移动（默认 10px） |

---

## 历史（History）

| Command ID | 功能 | 默认快捷键 |
|---|---|---|
| `history.undo` | 撤销 | `Mod+Z` |
| `history.redo` | 重做 | `Shift+Mod+Z` |

---

## 编辑（Edit / Clipboard / Group / LockHide）

| Command ID | 功能 | 默认快捷键 |
|---|---|---|
| `edit.copy` | 复制（会展开 group 后代） | `Mod+C` |
| `edit.cut` | 剪切 | `Mod+X` |
| `edit.paste` | 粘贴（保持 group 结构：remap id + parentId） | `Mod+V` |
| `edit.duplicate` | 创建副本（保持 group 结构） | `Mod+D` |
| `edit.delete` | 删除（会展开 group 后代） | `Delete` / `Backspace` |
| `edit.group` | 编组 | `Mod+G` |
| `edit.ungroup` | 解组 | `Shift+Mod+G` |
| `edit.lock` | 锁定（locked 仍可被选中） | — |
| `edit.unlock` | 解锁 | — |
| `edit.hide` | 隐藏（hidden 不命中/不渲染，并清空 selection） | — |
| `edit.showAll` | 显示全部（把所有 hidden=false） | — |

---

## 对齐 / 分布（Align / Distribute）

> 约定：对齐/分布使用“选中集合的 bounding box”作为参考；locked 节点会被跳过。

| Command ID | 功能 |
|---|---|
| `edit.alignLeft` | 左对齐 |
| `edit.alignHCenter` | 水平居中对齐 |
| `edit.alignRight` | 右对齐 |
| `edit.alignTop` | 顶对齐 |
| `edit.alignVCenter` | 垂直居中对齐 |
| `edit.alignBottom` | 底对齐 |
| `edit.distributeH` | 水平等间距分布 |
| `edit.distributeV` | 垂直等间距分布 |

---

## 视图（View）

| Command ID | 功能 | 默认快捷键 |
|---|---|---|
| `view.zoomIn` | 放大 | `Mod+=` |
| `view.zoomOut` | 缩小 | `Mod+-` |
| `view.resetZoom` | 重置缩放（100%） | — |
| `view.fitView` | 适配视图（包含原点 0,0） | — |
| `view.centerView` | 原点居中（让 0,0 在视口中心） | — |
| `view.fitSelection` | 适配选中 | — |
| `view.centerSelection` | 选中居中 | — |

---

## 层级（Z-Index）

| Command ID | 功能 |
|---|---|
| `z.bringToFront` | 置于顶层 |
| `z.bringForward` | 上移一层 |
| `z.sendBackward` | 下移一层 |
| `z.sendToBack` | 置于底层 |
| `z.normalize` | 规范化 z（按当前顺序重排为 0..n-1） |

---

## 导出（Export）

| Command ID | 功能 |
|---|---|
| `file.exportPng` | 触发 `export:png` 事件（骨架，宿主自行实现截图） |
