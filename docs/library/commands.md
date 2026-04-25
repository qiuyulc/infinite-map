# 命令速查表（Command IDs）

命令是“可被 UI / 快捷键 / API 统一触发的动作”。默认编辑器插件会注册大量命令到 registry。

触发方式：
- 宿主：`apiRef.current?.runCommand?.(id, { source: 'api' })`
- 或：`ctx.runCommand(id, { source })` / `ctx.bus.emit('command:run', { id, source })`

> 快捷键默认由 `createShortcutsPlugin()` 提供（可通过 `commandShortcuts` 覆盖/禁用）。

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
| `edit.delete` | 删除（会展开 group 后代） | `Delete / Backspace` |
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

