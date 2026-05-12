# 插件 API 参考

本文档是 `@qiuyulc/infinite-map-editor` 全部 24 个内置插件的详细参考。

每个插件包含：插件 ID、功能描述、声明式依赖、配置选项、注册的命令、使用的 Store Key 和事件。

---

## 目录

- [基础设施类](#基础设施类)
- [选择类](#选择类)
- [变换类](#变换类)
- [编辑类](#编辑类)
- [HUD 类](#hud-类)
- [视觉类](#视觉类)
- [扩展类](#扩展类)

---

## 基础设施类

### `keyboard-state`

**ID**: `keyboard-state`  
**功能**: 监听 `keydown`/`keyup`，维护 `Space` 键按下状态到 Store。  
**Provides**: —  
**Requires**: —  
**Options**: `KeyboardStatePluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `spaceKey` | `string` | `STORE_KEYS.keyboardSpace` | Space 键状态的 store key |

**Store Key**: `keyboard:space` (boolean)  
**Input**: `onKeyDown` / `onKeyUp`（处理 Space 键）

---

### `core-services`

**ID**: `core-services`  
**功能**: 注册核心服务到 `ctx.services`：`camera`（相机驱动）、`document`（统一 patches 入口）、`hud`（Toolbar/ContextMenu 贡献注册表）。  
**Provides**: —  
**Requires**: —  
**Options**: 无

---

### `command-runner`

**ID**: `command-runner`  
**功能**: 命令执行引擎。收集所有插件的 `commands` 到 `store.commands:registry`，提供统一的 `ctx.runCommand(id, payload)` 入口。  
**Provides**: `commands`  
**Requires**: —  
**Options**: 无

---

### `shortcuts`

**ID**: `shortcuts`  
**功能**: 将快捷键映射到命令。支持 `commandShortcuts` 覆盖（`null` = 禁用）。仅在画布聚焦时生效。  
**Provides**: —  
**Requires**: `commands`  
**Options**: `ShortcutsPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `commandShortcuts` | `Record<string, string \| null>` | — | 命令快捷覆盖（`null` 禁用） |

**Input**: `onKeyDown`（触发快捷键映射）

---

### `history`

**ID**: `history`  
**功能**: Undo/Redo 历史栈。监听 `patches:applied` 事件生成逆向 patch，支持 move-phase 合并。  
**Provides**: `history`  
**Requires**: `commands`  
**Options**: `HistoryPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `limit` | `number` | `200` | 历史栈最大长度 |

**Commands**:
- `history.undo`（`Mod+Z`）
- `history.redo`（`Mod+Shift+Z`）

**Store Keys**: `history:undoStack`、`history:redoStack`、`history:pending`、`history:version`  
**Bus Events**: 监听 `patches:applied`、`history:undo`、`history:redo`

---

### `view-commands`

**ID**: `view-commands`  
**功能**: 视图控制命令（zoom/fit/center）。同时写入 `view:config` 供其他插件读取。  
**Provides**: —  
**Requires**: `commands`  
**Options**: `ViewCommandsPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `paddingPx` | `number` | `48` | fit 时的 padding（屏幕像素） |
| `zoomStep` | `number` | `1.2` | zoom 步进倍率 |
| `minZoom` | `number` | `0.25` | 最小缩放 |
| `maxZoom` | `number` | `2.5` | 最大缩放 |

**Commands**:
- `view.zoomIn`（`Mod+=`）
- `view.zoomOut`（`Mod+-`）
- `view.resetZoom`
- `view.fitView`
- `view.centerView`
- `view.fitSelection`
- `view.centerSelection`

**Store Key**: `view:config`

---

### `z-index`

**ID**: `z-index`  
**功能**: 层级（zIndex）命令：置顶/置底/上移一层/下移一层/归位。  
**Provides**: —  
**Requires**: `commands`  
**Options**: 无

**Commands**:
- `z.bringToFront`
- `z.bringForward`
- `z.sendBackward`
- `z.sendToBack`
- `z.normalize`

---

### `export-png`

**ID**: `export-png`  
**功能**: 导出 PNG 命令（骨架）。触发 `export:png` 事件，由宿主实现截图逻辑。  
**Provides**: —  
**Requires**: `commands`  
**Options**: `ExportPngPluginOptions`

**Commands**:
- `file.exportPng`

**Bus Events**: 触发 `export:png`

---

## 选择类

### `selection`

**ID**: `selection`  
**功能**: 选择服务。提供 hitTest（节点命中）、pointerDownProcessor（选中逻辑）、overlay（选中框+缩放手柄）。  
**Provides**: `selection`  
**Requires**: —  
**Options**: `SelectionPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `storeKey` | `string` | — | 自定义 selection store key |
| `clearOnBlankClick` | `boolean` | — | 点击空白是否清空选择 |

**Store Key**: `selection:ids` (string[])  
**Bus Events**: 触发 `selection:change`  
**HitTests**: 节点命中检测  
**PointerDownProcessors**: 点击选中/多选/清空逻辑  
**Overlay**: `SelectionOverlay`（选中框 + 8 个缩放手柄），slot=`overlay`

---

### `marquee-select`

**ID**: `marquee-select`  
**功能**: 框选。空白拖拽时渲染矩形选框，松手后框内节点被选中。默认放最后以避免与 drag/pan 冲突。  
**Provides**: —  
**Requires**: `selection`  
**Options**: `MarqueeSelectPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用 |
| `requireShift` | `boolean` | `false` | 是否需要 Shift 才能框选 |
| `storeKey` | `string` | — | 自定义 store key |
| `selectionKey` | `string` | — | 自定义 selection key |
| `minDragPx` | `number` | — | 形成框选的最小拖动距离 |

**Store Key**: `marquee:state`  
**Gesture**: marquee 手势（`canStart` 判断是否空白区域）  
**Overlay**: `MarqueeOverlay`（框选矩形），slot=`overlay`

---

## 变换类

### `drag`

**ID**: `drag`  
**功能**: 拖拽移动。支持多选整体移动、吸附（对齐线/网格/参考线/视口中心线）、Engine 模式（move 阶段直写 DOM）。  
**Provides**: —  
**Requires**: —  
**Options**: `DragPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `dragKey` | `string` | — | 自定义 drag store key |
| `selectOnDrag` | `boolean` | `true` | 拖拽未选中节点时是否先选中 |
| `selectionKey` | `string` | — | 自定义 selection key |

**Store Key**: `drag:state`  
**Bus Events**: 触发 `drag:start` / `drag:move` / `drag:end`  
**Gesture**: drag 手势（priority=100）

---

### `resize`

**ID**: `resize`  
**功能**: 8 点缩放手柄。通过 hitTest 检测手柄命中，gesture 执行缩放。支持等比缩放（Shift）。仅单选时显示。  
**Provides**: —  
**Requires**: —  
**Options**: `ResizePluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `selectionKey` | `string` | — | 自定义 selection key |
| `spaceKey` | `string` | — | 自定义 space key |
| `hitRadiusPx` | `number` | — | 手柄命中半径（px） |
| `minSize` | `number` | — | 最小宽高（世界单位） |

**Store Key**: `resize:state`  
**HitTests**: 8 个缩放手柄命中检测  
**Gesture**: resize 手势（priority=100）

---

### `rotate`

**ID**: `rotate`  
**功能**: 2D 旋转。选中节点后显示旋转 handle，拖拽旋转。  
**Provides**: —  
**Requires**: —  
**Options**: 无（使用 SelectionOverlay 的 handle）

**Store Key**: `rotate:state`  
**HitTests**: 旋转 handle 命中检测  
**Gesture**: rotate 手势（priority=100）

---

### `rotate3d`

**ID**: `rotate3d`  
**功能**: 3D 旋转。`Alt + 拖拽` 修改 `rotationX/rotationY`。通过独立 handle 检测避免与 2D 旋转冲突。  
**Provides**: —  
**Requires**: —  
**Options**: 无

**Store Key**: `rotate3d:state`  
**HitTests**: 3D 旋转区域命中检测  
**Gesture**: rotate3d 手势

---

## 编辑类

### `clipboard`

**ID**: `clipboard`  
**功能**: 复制/剪切/粘贴/删除/副本。支持 group 结构（复制时 remap id + 修正 parentId），连续粘贴偏移。  
**Provides**: —  
**Requires**: `commands`, `selection`, `history`  
**Options**: `ClipboardPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用 |
| `offsetWorld` | `number` | — | paste/duplicate 偏移量（世界单位） |

**Commands**:
- `edit.copy`（`Mod+C`）
- `edit.paste`（`Mod+V`）
- `edit.cut`（`Mod+X`）
- `edit.duplicate`（`Mod+D`）
- `edit.delete`（`Delete` / `Backspace`）

**Store Key**: `clipboard:data`、`clipboard:pasteCount`

---

### `group`

**ID**: `group`  
**功能**: 编组/解组。选中多个节点后 `edit.group` 创建 group 节点（`kind='group'`），成员 `parentId` 指向 group。解组时删除 group，成员 `parentId` 清空。  
**Provides**: `group`  
**Requires**: `commands`, `selection`, `document`  
**Options**: 无

**Commands**:
- `edit.group`（`Mod+G`）
- `edit.ungroup`（`Shift+Mod+G`）

**Service**: `group` — 提供 `expandIds(ids)` 方法供 drag 等插件展开 group 后代

---

### `lock-hide`

**ID**: `lock-hide`  
**功能**: 锁定/隐藏节点。锁定传递（祖先 locked → 后代视为 locked），隐藏传递（祖先 hidden → 后代视为 hidden）。`showAll` 恢复所有隐藏节点。  
**Provides**: —  
**Requires**: `commands`  
**Options**: 无

**Commands**:
- `edit.lock`
- `edit.unlock`
- `edit.hide`
- `edit.showAll`

---

### `align-distribute`

**ID**: `align-distribute`  
**功能**: 对齐/分布。计算选中节点集合的包围盒，按左/中/右/上/中/下对齐或水平/垂直等间距分布。  
**Provides**: —  
**Requires**: `commands`, `selection`, `document`  
**Options**: 无

**Commands**:
- `edit.alignLeft` / `edit.alignHCenter` / `edit.alignRight`
- `edit.alignTop` / `edit.alignVCenter` / `edit.alignBottom`
- `edit.distributeH` / `edit.distributeV`

---

### `nudge`

**ID**: `nudge`  
**功能**: 键盘微调。`↑↓←→` 移动 1px，`Shift+↑↓←→` 移动 10px。  
**Provides**: —  
**Requires**: `selection`  
**Options**: `NudgePluginOptions`

**Input**: `onKeyDown`（处理方向键）

---

## HUD 类

### `toolbar`

**ID**: `toolbar`  
**功能**: 顶部工具栏。支持按 key 排列按钮，混合自定义项。  
**Provides**: —  
**Requires**: —  
**Options**: `ToolbarPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 是否启用 |
| `items` | `(string \| ToolbarItem)[]` | 内置默认项 | 自定义按钮。字符串按 key 展开（`'\|'` = 分隔线） |
| `position` | `'top-left' \| 'top-right'` | `'top-left'` | 工具栏位置 |

内置 key：`history.undo` `history.redo` `view.zoomOut` `view.zoomIn` `view.resetZoom` `view.fitView` `view.centerView` `edit.delete`

**Overlay**: `ToolbarOverlay`, slot=`hud`  
**Store Key**: 读取 `toolbar:items`（外部贡献项）

---

### `context-menu`

**ID**: `context-menu`  
**功能**: 右键菜单事件处理。检测右键命中，处理"命中 group 后代时选中最外层 group"逻辑。  
**Provides**: —  
**Requires**: —  
**Options**: `ContextMenuPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `storeKey` | `string` | — | 自定义 store key |

**Input**: `onContextMenu`  
**Store Key**: `contextmenu:state`

---

### `default-context-menu`

**ID**: `default-context-menu`  
**功能**: 默认右键菜单 UI。支持按 key 排列菜单项，混合自定义项。  
**Provides**: —  
**Requires**: —  
**Options**: `DefaultContextMenuOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `false` | 是否启用 |
| `items` | `(string \| ContextMenuItem)[]` | 内置默认项 | 自定义菜单项。字符串按 key 展开（`'\|'` = 分隔线） |

内置 key：`edit.copy` `edit.cut` `edit.paste` `edit.duplicate` `edit.delete` `z.bringToFront` `z.bringForward` `z.sendBackward` `z.sendToBack` `edit.group` `edit.ungroup` `edit.lock` `edit.unlock` `edit.hide` `edit.showAll` `view.fitView` `view.centerView` `view.fitSelection` `view.centerSelection`

**Overlay**: 右键菜单 UI，slot=`hud`  
**Store Key**: 读取 `contextmenu:state`、`contextmenu:items`

---

### `minimap`

**ID**: `minimap`  
**功能**: 小地图。渲染节点缩略图和视口框（Canvas 2D 绘制）。  
**Provides**: —  
**Requires**: —  
**Options**: `MinimapPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用 |
| `width` | `number` | `260` | 宽度（px） |
| `height` | `number` | `160` | 高度（px） |
| `cachePadding` | `number` | `120` | 缓存区 padding |
| `includeOrigin` | `boolean` | `true` | 是否强制包含原点 |
| `showStats` | `boolean` | `false` | 是否显示调试统计 |

**Overlay**: `MinimapOverlay`（Canvas 绘制），slot=`hud`  
**Store Keys**: `minimap:config`、`minimap:inViewCount`、`minimap:needsRedraw`、`minimap:enabled`

---

### `rulers`

**ID**: `rulers`  
**功能**: 标尺。顶部/左侧显示世界坐标刻度，自适应 zoom。支持标尺拖拽平移和参考线拖放。使用 imperative SVG DOM 操作。  
**Provides**: —  
**Requires**: —  
**Options**: `RulersPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用 |
| `thickness` | `number` | `24` | 标尺宽度/高度（px） |

**Overlay**: `RulersOverlay`（SVG 动态绘制），slot=`hud`

---

### `zoom-dock`

**ID**: `zoom-dock`  
**功能**: 右下角缩放滑杆。slider + 吸附开关。通过 `runCommand` 驱动缩放。  
**Provides**: —  
**Requires**: —  
**Options**: `ZoomDockPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用 |

**Overlay**: `ZoomDockOverlay`，slot=`hud`

---

## 视觉类

### `hover-highlight`

**ID**: `hover-highlight`  
**功能**: 鼠标周围光晕效果。通过 `inputHooks.onBeforeHitTest` 追踪鼠标位置，Canvas 渲染径向渐变 + 点阵高亮（滚轮时有脉冲动画）。  
**Provides**: —  
**Requires**: —  
**Options**: `HoverHighlightPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用 |

**InputHooks**: `onBeforeHitTest`  
**Overlay**: Canvas highlight overlay，slot=`background`

---

### `snap-guides`

**ID**: `snap-guides`  
**功能**: 吸附引导线。从 `store.snap:guides` 读取吸附位置，渲染对齐线和 overlay。同时提供 `snap:config` 供 drag/resize 等插件读取。  
**Provides**: —  
**Requires**: —  
**Options**: `SnapGuidesPluginOptions`

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | `boolean` | `true` | 是否启用 |
| `guidesEnabled` | `boolean` | `true` | 是否显示辅助线 |
| `gridSize` | `number \| 'auto'` | `'auto'` | 网格吸附大小（世界单位） |
| `thresholdPx` | `number` | — | 吸附阈值（屏幕像素） |

**Store Keys**: `snap:config`（写入）、`snap:guides`（读取）  
**Overlay**: `SnapGuidesOverlay`（对齐线渲染），slot=`overlay`

---

## 扩展类

### `drop-to-create`

**ID**: `drop-to-create`  
**功能**: 拖拽创建节点。监听 `document` 的 `dragover`/`drop` 事件，通过 `ctx.screenToWorld` 计算世界坐标创建节点。包含 ghost 预览 overlay。  
**Provides**: —  
**Requires**: —  
**Options**: `DropToCreatePluginOptions`

**Overlay**: ghost 预览组件，slot=`overlay`

---

## 默认插件组装

`createDefaultEditorPlugins`（无 UI）包含上述插件的大部分（不含 HUD 类）。  
`createDefaultEditorPluginsWithUI` 在前者基础上叠加 HUD 类插件。

完整顺序和依赖关系见 [架构总览](/docs/infinite-map-editor/overview)。
