# 功能清单（按功能逐条列）

本文不按“模块/大类”划分，而是**按功能逐条列出**：每一条就是你在产品里能看到/能操作到的一个功能点。后续我们可以按这份清单逐条补齐对应的 API、事件、配置项与示例。

> 说明：
> - 默认行为以 `createDefaultEditorPluginsWithUI()` 为准；宿主裁剪/覆盖配置后会有差异。

---

## 01. 画布平移（Pan）

- 如何用：
  - `Space`（按住）+ 左键拖拽：平移画布（推荐）
  - 触控板两指拖动：平移（wheel pan，需 `panEnabled=true`）
- 备注：`viewPanEnabled=false` 会禁用平移（包括 Space 模式）。

## 02. 画布缩放（Zoom）

- 如何用：
  - ZoomDock 缩放条（slider）
  - 触控板捏合/滚轮（取决于设备/浏览器）
- 命令：
  - `view.zoomIn` / `view.zoomOut` / `view.resetZoom`

## 03. 适配视图（Fit View）

- 效果：把视图调整到能看见主要区域（默认包含原点 0,0 的语义）。
- 命令：`view.fitView`

## 04. 原点居中（Center View）

- 效果：让 world 原点（0,0）居中到视口中心。
- 命令：`view.centerView`

## 05. 适配选中（Fit Selection）

- 效果：缩放/平移相机，使选中的节点集合在视口中“刚好可见”。
- 命令：`view.fitSelection`

## 06. 选中居中（Center Selection）

- 效果：平移相机，让选中集合居中（通常不改变 zoom）。
- 命令：`view.centerSelection`

## 07. 单选/多选（Selection）

- 如何用：
  - 点击节点：单选
  - `Shift` + 点击：多选 toggle
  - 点击空白：清空选择（可配置）
- 备注：locked 节点允许被选中（便于解锁），但会阻断后续拖拽/缩放等手势。

## 08. 框选（Marquee Select）

- 如何用：空白处拖拽形成矩形框，框内节点会被选中。
- 可配置：
  - `marquee.requireShift=true`：Shift + 拖拽才框选（避免抢占“空白拖拽平移”）

## 09. 拖动节点（Drag / Move）

- 如何用：选中节点后左键拖动。
- 可配置：`selectOnDrag`（拖未选中节点时是否先选中再拖）。

## 10. 键盘微调（Nudge）

- 如何用：
  - `↑ ↓ ← →`：1px 微调
  - `Shift + ↑ ↓ ← →`：10px 大步微调

## 11. 改变尺寸（Resize）

- 如何用：单选节点时，拖拽 8 个缩放 handle 改变宽高。

## 12. 2D 旋转（Rotate）

- 如何用：单选节点时，拖拽旋转 handle 调整 `rotation`。

## 13. 3D 旋转（Rotate3D）

- 如何用：`Option(⌥)/Alt + 拖拽` 调整 `rotationX/rotationY`。

## 14. 吸附开关（Snapping Toggle）

- 如何用：ZoomDock 里的“吸附/辅助线”开关（对应 `snapConfig.enabled`）。
- 备注：关闭后不进行吸附计算，也不会显示吸附辅助线。

## 15. 对齐吸附（Snap to Other Nodes）

- 效果：拖动/缩放节点时，靠近其它可见节点的边/中心线会自动对齐吸附。
- 备注：阈值由 `thresholdPx` 控制（屏幕像素阈值，内部换算为 world）。

## 16. 网格吸附（Snap to Grid）

- 效果：当没有命中“对齐线吸附”时，按网格对齐吸附。
- 配置：`gridSize='auto' | number`

## 17. 标尺刻度（Rulers）

- 效果：顶部/左侧显示世界坐标刻度，随缩放自动调整主/次刻度密度。

## 18. 标尺单轴平移（Drag Rulers to Pan）

- 如何用：
  - 顶部标尺左右拖：只平移 X
  - 左侧标尺上下拖：只平移 Y

## 19. 参考线（Guides：从标尺拖出）

- 如何用：
  - 从顶部标尺向下拖入画布：生成垂直参考线
  - 从左侧标尺向右拖入画布：生成水平参考线

## 20. 参考线编辑（拖动/删除/清空）

- 如何用：
  - 拖动参考线：调整位置
  - 双击参考线：删除单条
  - 双击左上角标尺交叉区：清空全部参考线

## 21. 参考线吸附（Snap to Guides）

- 效果：开启 snapping 后，拖动/缩放节点会吸附到参考线位置。

## 22. 对齐（Align）

- 功能：对齐左/中/右/上/中/下。
- 命令：
  - `edit.alignLeft` / `edit.alignHCenter` / `edit.alignRight`
  - `edit.alignTop` / `edit.alignVCenter` / `edit.alignBottom`
- UI：已挂到右键菜单（选中 ≥2 才可用）。

## 23. 分布（Distribute）

- 功能：水平等间距 / 垂直等间距。
- 命令：`edit.distributeH` / `edit.distributeV`
- UI：已挂到右键菜单（选中 ≥3 才可用）。

## 24. 层级（Z-Index）

- 功能：置顶/上移/下移/置底/规范化。
- 命令：
  - `z.bringToFront` / `z.bringForward`
  - `z.sendBackward` / `z.sendToBack`
  - `z.normalize`

## 25. 复制 / 剪切 / 粘贴 / 副本 / 删除（Clipboard）

- 命令：
  - `edit.copy` / `edit.cut` / `edit.paste`
  - `edit.duplicate`
  - `edit.delete`

## 26. 编组 / 解组（Group）

- 命令：`edit.group` / `edit.ungroup`

## 27. 锁定 / 解锁（Lock）

- 命令：`edit.lock` / `edit.unlock`
- 备注：locked 节点可选中，但会阻断 drag/resize/rotate 等编辑手势。

## 28. 隐藏 / 显示全部（Hide）

- 命令：`edit.hide` / `edit.showAll`
- 备注：hidden 节点不命中/不渲染，并会清空 selection。

## 29. 撤销 / 重做（Undo / Redo）

- 命令：`history.undo` / `history.redo`
- 默认快捷键：`Mod+Z` / `Shift+Mod+Z`

## 30. 右键菜单（Context Menu）

- 默认包含：剪贴板、层级、视图、删除
- 已扩展：对齐/分布（含 icon）

## 31. 工具栏（Toolbar）

- 默认包含：undo/redo、zoom、fit/center、delete（以及宿主/插件贡献项）

## 32. 小地图（Minimap）

- 功能：缩略预览、拖动视口框移动视图（引擎模式下）

## 33. 导出 PNG（Export PNG：事件骨架）

- 命令：`file.exportPng`
- 说明：触发 `export:png` 事件（宿主自行实现截图与下载）。

## 34. 受控编辑数据流（Controlled Editing）

- 两种输出：
  - `onNodesChange(nextNodes)`：全量数组
  - `onPatches(patches, meta)`：差量变更（推荐）
- 工具：`applyPatchesToNodes(prev, patches)`

## 35. API 引用（apiRef）

- 常用：
  - `getCamera()` / `setCamera(next, { immediate })`
  - `runCommand(id, { source })`

## 36. 错误隔离（Editor Errors）

- OverlayErrorBoundary + `onEditorError(err, info)`：避免单个插件/overlay 渲染错误导致整棵树崩溃。

---

## 下一步怎么补文档

你指定一个功能编号（例如“19/20/21 参考线相关”或“34 受控编辑数据流”），我就按该功能补齐：
- API（props / service / apiRef）
- 事件（bus.emit/on）
- store keys（STORE_KEYS 与自定义 keys）
- 默认快捷键/命令
- 最小可运行示例
