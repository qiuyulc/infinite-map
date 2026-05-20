# 操作与快捷键

Infinite Map 编辑器的完整交互指南：鼠标/触控板操作、键盘快捷键、Command ID 速查。

> 约定：`Mod` 表示 `⌘`（macOS）或 `Ctrl`（Windows）。

---

## 1. 基础操作

### 1.1 平移（Pan）

| 操作       | 快捷键                    | 说明                                          |
| ---------- | ------------------------- | --------------------------------------------- |
| 平移画布   | `Space`（按住）+ 左键拖拽 | 按住空格进入平移模式，selection/drag 不抢输入 |
| 触控板平移 | 两指拖动                  | 需 `panEnabled=true`                          |

**标尺辅助平移**（需启用 `rulers` 插件）：

| 操作             | 说明        |
| ---------------- | ----------- |
| 顶部标尺左右拖拽 | 仅平移 X 轴 |
| 左侧标尺上下拖拽 | 仅平移 Y 轴 |

> 框选（Marquee）默认会在空白处左键拖拽时触发。想把空白拖拽改回平移，配置 `marquee: { requireShift: true }`。

### 1.2 缩放（Zoom）

| 操作          | 说明         |
| ------------- | ------------ |
| 触控板捏合    | pinch zoom   |
| `Ctrl` + 滚轮 | 鼠标滚轮缩放 |
| ZoomDock 滑杆 | UI 拖动缩放  |

### 1.3 选择

#### 单击

| 操作                    | 说明                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| 点击节点                | 自动沿 `parentId` 链提升到最外层 `kind='group'` 的祖先节点并选中 |
| 点击无祖先 group 的节点 | 选中该节点自身                                                   |
| 点击空白处              | 清空选中                                                         |
| `Shift` + 点击节点      | 提升到最外层 group 后 toggle（追加/移除）                        |

#### 双击

| 操作     | 说明                                                                  |
| -------- | --------------------------------------------------------------------- |
| 双击节点 | 穿透提升，直接选中该节点自身（不受 group 提升影响，Shift 无额外效果） |

#### 框选

| 操作           | 说明                                            |
| -------------- | ----------------------------------------------- |
| 空白处左键拖拽 | 框选（可配置 `requireShift` 限制 Shift 才框选） |

### 1.4 拖拽 / 缩放 / 旋转

| 操作     | 说明                                                  |
| -------- | ----------------------------------------------------- |
| 拖拽移动 | 选中节点后左键拖拽（支持多选整体移动）                |
| 键盘微调 | `↑ ↓ ← →`（默认 1px）                                 |
| 大步微调 | `Shift + ↑ ↓ ← →`（默认 10px）                        |
| 8 点缩放 | 拖动 resize handle（单选时显示）                      |
| 2D 旋转  | 拖动旋转 handle                                       |
| 3D 旋转  | `Alt/Option` + 拖拽节点（修改 `rotationX/rotationY`） |

### 1.5 参考线（从标尺拖出）

> 需要启用 `rulers` 插件。参考线会参与吸附。

| 操作                 | 说明           |
| -------------------- | -------------- |
| 从顶部标尺向下拖拽   | 生成水平参考线 |
| 从左侧标尺向右拖拽   | 生成垂直参考线 |
| 拖动参考线           | 调整位置       |
| 双击参考线           | 删除该参考线   |
| 双击左上角标尺交叉区 | 清除全部参考线 |

---

## 2. 命令与快捷键速查

命令可通过以下方式触发：

```ts
apiRef.current?.runCommand?.(id, { source: "api" });
// 或 ctx.runCommand(id, { source: 'toolbar' | 'menu' | 'keyboard' | 'api' })
```

### 2.1 历史

| Command ID     | 功能 | 默认快捷键    |
| -------------- | ---- | ------------- |
| `history.undo` | 撤销 | `Mod+Z`       |
| `history.redo` | 重做 | `Shift+Mod+Z` |

### 2.2 剪贴板与编辑

| Command ID       | 功能     | 默认快捷键             |
| ---------------- | -------- | ---------------------- |
| `edit.copy`      | 复制     | `Mod+C`                |
| `edit.cut`       | 剪切     | `Mod+X`                |
| `edit.paste`     | 粘贴     | `Mod+V`                |
| `edit.duplicate` | 创建副本 | `Mod+D`                |
| `edit.delete`    | 删除     | `Delete` / `Backspace` |
| `edit.group`     | 编组     | `Mod+G`                |
| `edit.ungroup`   | 解组     | `Shift+Mod+G`          |
| `edit.lock`      | 锁定     | —                      |
| `edit.unlock`    | 解锁     | —                      |
| `edit.hide`      | 隐藏     | —                      |
| `edit.showAll`   | 显示全部 | —                      |

### 2.3 对齐 / 分布

| Command ID          | 功能           |
| ------------------- | -------------- |
| `edit.alignLeft`    | 左对齐         |
| `edit.alignHCenter` | 水平居中       |
| `edit.alignRight`   | 右对齐         |
| `edit.alignTop`     | 顶对齐         |
| `edit.alignVCenter` | 垂直居中       |
| `edit.alignBottom`  | 底对齐         |
| `edit.distributeH`  | 水平等间距分布 |
| `edit.distributeV`  | 垂直等间距分布 |

> 对齐需 ≥ 2 个选中节点，分布需 ≥ 3 个。locked 节点会被跳过。

### 2.4 视图

| Command ID             | 功能             | 默认快捷键 |
| ---------------------- | ---------------- | ---------- |
| `view.zoomIn`          | 放大             | `Mod+=`    |
| `view.zoomOut`         | 缩小             | `Mod+-`    |
| `view.resetZoom`       | 重置缩放（100%） | —          |
| `view.fitView`         | 适配全部节点     | —          |
| `view.centerView`      | 原点居中         | —          |
| `view.fitSelection`    | 适配选中         | —          |
| `view.centerSelection` | 选中居中         | —          |

### 2.5 层级

| Command ID       | 功能                      |
| ---------------- | ------------------------- |
| `z.bringToFront` | 置于顶层                  |
| `z.bringForward` | 上移一层                  |
| `z.sendBackward` | 下移一层                  |
| `z.sendToBack`   | 置于底层                  |
| `z.normalize`    | 规范化 z（重排为 0..n-1） |

### 2.6 导出

| Command ID       | 功能     | 说明                                     |
| ---------------- | -------- | ---------------------------------------- |
| `file.exportPng` | 导出 PNG | 触发 `export:png` 事件，宿主自行实现截图 |

---

## 下一步

- [编辑与变更流](/editor/editing) — 深入理解 patches 机制
- [插件配置](/editor/plugin-config) — 所有可配置项
- [插件 API 参考](/editor/plugin-reference) — 每个插件的详细 API
