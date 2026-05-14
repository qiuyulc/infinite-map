# 操作与快捷键（Mac + Windows）

本文整理 Infinite Map / Infinite Map Editor 的**默认交互**、**快捷键**、以及对应的 **Command ID**（用于菜单/工具栏/API 触发）。

> 约定：`Mod` 表示 `⌘`（macOS）或 `Ctrl`（Windows）。
>
> 若你的宿主对插件配置做了修改（比如改了 keymap、禁用某些插件），实际行为以宿主为准。

---

## 1. 基础操作（鼠标 / 触控板）

### 1.1 平移（Pan）

| 操作 | Mac | Windows | 说明 |
|---|---|---|---|
| 平移画布（推荐） | `Space`（按住）+ 左键拖拽 | `Space`（按住）+ 左键拖拽 | 默认交互：按住空格进入平移模式（selection/drag 等不会抢输入） |
| 触控板两指平移 | 两指拖动 | 两指拖动（触控板） | 走 wheel pan（需要 `panEnabled=true`） |

#### 标尺辅助平移（Rulers）

> 需要启用 `rulers` 插件（`createDefaultEditorPluginsWithUI` 默认开启）。

| 操作 | 说明 |
|---|---|
| 在顶部标尺左右拖拽 | 仅平移 X 轴（横向） |
| 在左侧标尺上下拖拽 | 仅平移 Y 轴（纵向） |

> 如果你启用了“框选（Marquee）”插件，**空白处左键拖拽**通常会变成框选。  
> 想把“空白左键拖拽”改回平移，请在创建默认编辑器插件时配置：`marquee: { requireShift: true }`（Shift 才框选）。

### 1.2 缩放（Zoom）

| 操作 | Mac | Windows | 说明 |
|---|---|---|---|
| 触控板捏合缩放 | 捏合 | 触控板捏合 | pinch zoom |
| 鼠标滚轮缩放 | `Ctrl`/`⌘` + 滚轮（取决于设备） | `Ctrl` + 滚轮（取决于设备） | 浏览器/系统对“滚轮缩放”有差异，建议用 ZoomDock 或命令 |
| ZoomDock 缩放条 | 拖动 slider | 拖动 slider | UI 触发相机变更 |

### 1.3 框选（Marquee Select）

| 操作 | Mac | Windows | 说明 |
|---|---|---|---|
| 框选 | 空白处左键拖拽（或 `Shift` + 拖拽，取决于配置） | 同左 | 可配置 `marquee.requireShift` 让 Shift 才框选 |

### 1.4 选择（Selection）

#### 单击

| 操作 | 说明 |
|---|---|
| 点击节点 | 自动沿 `parentId` 链提升到最外层 `kind='group'` 的祖先节点并选中 |
| 点击无祖先 group 的节点 | 选中该节点自身 |
| 点击空白处 | 清空选中 |
| `Shift` + 点击 | 提升到最外层 group 后 toggle（追加/移除） |

#### 双击

| 操作 | 说明 |
|---|---|
| 双击节点 | 穿透提升，直接选中该节点自身（不受 group 提升影响） |
| `Shift` + 双击 | 穿透提升后 toggle 该节点 |

### 1.5 节点拖拽（Move Node）

| 操作 | Mac | Windows | 说明 |
|---|---|---|---|
| 拖动节点移动 | 选中节点后左键拖拽 | 同左 | 拖动期间产生 move patches（phase=move/end） |
| 键盘微调（nudge） | `↑ ↓ ← →` | `↑ ↓ ← →` | 默认 1px |
| 大步微调 | `Shift + ↑ ↓ ← →` | `Shift + ↑ ↓ ← →` | 默认 10px |

### 1.6 Resize（改变尺寸）

| 操作 | Mac | Windows | 说明 |
|---|---|---|---|
| 改变尺寸 | 拖动 8 个 resize handle | 同左 | 单选时显示 8 个 handle |

### 1.7 Rotate（旋转）

| 操作 | Mac | Windows | 说明 |
|---|---|---|---|
| 2D 旋转 | 拖动旋转 handle | 同左 | 修改 `rotation` |
| 3D 旋转（沿 X/Y 轴） | `Option(⌥)` + 拖拽节点 | `Alt` + 拖拽节点 | 修改 `rotationX/rotationY` |

---

## 1.8 参考线（Guides，来自标尺）

> 参考线会参与吸附：当开启 snapping（`snapConfig.enabled=true`）时，拖拽/缩放节点会吸附到参考线位置。

| 操作 | 说明 |
|---|---|
| 从顶部标尺向下拖拽 | 生成一条**垂直参考线** |
| 从左侧标尺向右拖拽 | 生成一条**水平参考线** |
| 拖动参考线 | 调整参考线位置 |
| 双击参考线 | 删除该参考线 |
| 双击左上角标尺交叉区 | 清除全部参考线 |

---

## 2. 快捷键与命令（Command IDs）

命令可通过以下方式触发：

```ts
apiRef.current?.runCommand?.(id, { source: 'api' });
// 或 ctx.runCommand(id, { source: 'toolbar' | 'menu' | 'keyboard' | 'api' })
```

### 2.1 历史（History）

| 功能 | Command ID | Mac 默认快捷键 | Windows 默认快捷键 |
|---|---|---|---|
| 撤销 | `history.undo` | `⌘ + Z` | `Ctrl + Z` |
| 重做 | `history.redo` | `⇧ + ⌘ + Z` | `Shift + Ctrl + Z` |

### 2.2 编辑（Edit / Clipboard / Group / LockHide）

| 功能 | Command ID | Mac 默认快捷键 | Windows 默认快捷键 |
|---|---|---|---|
| 复制 | `edit.copy` | `⌘ + C` | `Ctrl + C` |
| 剪切 | `edit.cut` | `⌘ + X` | `Ctrl + X` |
| 粘贴 | `edit.paste` | `⌘ + V` | `Ctrl + V` |
| 创建副本 | `edit.duplicate` | `⌘ + D` | `Ctrl + D` |
| 删除 | `edit.delete` | `Delete` / `⌫` | `Delete` / `Backspace` |
| 编组 | `edit.group` | `⌘ + G` | `Ctrl + G` |
| 解组 | `edit.ungroup` | `⇧ + ⌘ + G` | `Shift + Ctrl + G` |
| 锁定 | `edit.lock` | — | — |
| 解锁 | `edit.unlock` | — | — |
| 隐藏 | `edit.hide` | — | — |
| 显示全部 | `edit.showAll` | — | — |

### 2.3 对齐 / 分布（Align / Distribute）

| 功能 | Command ID |
|---|---|
| 左对齐 | `edit.alignLeft` |
| 水平居中对齐 | `edit.alignHCenter` |
| 右对齐 | `edit.alignRight` |
| 顶对齐 | `edit.alignTop` |
| 垂直居中对齐 | `edit.alignVCenter` |
| 底对齐 | `edit.alignBottom` |
| 水平等间距分布 | `edit.distributeH` |
| 垂直等间距分布 | `edit.distributeV` |

### 2.4 视图（View）

| 功能 | Command ID | Mac 默认快捷键 | Windows 默认快捷键 |
|---|---|---|---|
| 放大 | `view.zoomIn` | `⌘ + =` | `Ctrl + =` |
| 缩小 | `view.zoomOut` | `⌘ + -` | `Ctrl + -` |
| 重置缩放（100%） | `view.resetZoom` | — | — |
| 适配视图（包含原点 0,0） | `view.fitView` | — | — |
| 原点居中（0,0 居中） | `view.centerView` | — | — |
| 适配选中 | `view.fitSelection` | — | — |
| 选中居中 | `view.centerSelection` | — | — |

### 2.5 层级（Z-Index）

| 功能 | Command ID |
|---|---|
| 置于顶层 | `z.bringToFront` |
| 上移一层 | `z.bringForward` |
| 下移一层 | `z.sendBackward` |
| 置于底层 | `z.sendToBack` |
| 规范化 z（重排为 0..n-1） | `z.normalize` |

### 2.6 导出（Export）

| 功能 | Command ID | 说明 |
|---|---|---|
| 导出 PNG（事件） | `file.exportPng` | 触发 `export:png` 事件（宿主自行实现截图） |

---

## 3. 相关文档

- [命令速查表（Command IDs）](/library/commands)
- [编辑与变更流（onPatches）](/library/editing)
- [视图控制（铺满/居中/锁定）](/library/view)
