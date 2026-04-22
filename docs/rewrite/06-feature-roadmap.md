# 06. 功能路线图（按模块实现：从用户操作到代码）

这一章的写法是固定的。每个功能都按同一个模板：

1) 用户做了什么（操作）  
2) 数据怎么变（nodes / camera / store）  
3) 代码放哪（目录/文件）  
4) 伪代码（你照着写就行）  
5) 怎么验证（playground 里怎么测）  

> 你可以把这一章当作“实现清单”。按顺序做，你就能从0写出一个完整库。

---

## A. Selection（选中）

### 1) 操作
- 单击节点：选中
- Shift + 单击：多选/取消
- 空白单击：清空选中

### 2) 数据变化
- `store.selectionIds = string[]`
- `bus.emit('selection:change')`

### 3) 代码位置（建议）
- `src/editor/plugins/selection/createSelectionPlugin.tsx`
- `src/editor/plugins/selection/SelectionOverlay.tsx`（选中框 UI）

### 4) 伪代码
```txt
onPointerDown(e):
  if hit node:
    if shift: toggle id
    else: set [id]
  else:
    clear
  store.set(selectionIds)
  bus.emit(selection:change)
```

### 5) 验证
- 点击节点，看到选中框
- Shift 多选
- 空白清空

---

## B. Drag（拖拽移动）

### 1) 操作
- 按住选中节点拖拽

### 2) 数据变化
- 节点 `x/y` 改变（输出 patches 或直接 setNodes）

### 3) 代码位置
- `src/editor/plugins/transform/createDragPlugin.ts`

### 4) 伪代码（核心：screen → world）
```txt
onDown:
  record start pointer (screen)
  record start node positions (world)
onMove:
  dxScreen = cur - start
  dxWorld = dxScreen / camera.zoom
  apply patches: node.x = startX + dxWorld
```

### 5) 验证
- zoom 之后拖拽仍然稳定（不会飘）

---

## C. Resize（缩放尺寸）

### 1) 操作
- 拖拽 8 个 handle 改 w/h（可选：带保持比例）

### 2) 数据变化
- 节点 `w/h` 改变

### 3) 代码位置
- `src/editor/plugins/transform/createResizePlugin.ts`

### 4) 伪代码
```txt
hitTest handles
onMove:
  deltaWorld = deltaScreen / zoom
  w/h += deltaWorld
  clamp min size
```

### 5) 验证
- 选中单个节点出现 handle
- 拖动 handle 尺寸改变

---

## D. History（撤销/重做）

### 操作
- Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z

### 数据变化
- undoStack / redoStack（在 store）

### 代码位置
- `src/editor/plugins/core/createHistoryPlugin.ts`

### 核心原则（面试亮点）
- 所有修改走 patch 管道
- history 记录 patch（或记录快照）

---

## E. Clipboard（复制/粘贴/重复）

代码位置：
- `src/editor/plugins/clipboard/createClipboardPlugin.ts`

为什么是插件？
- 业务是否支持剪贴板不一定（有些只读场景）

---

## F. ZIndex（层级）

代码位置：
- `src/editor/plugins/core/createZIndexPlugin.ts`

功能：
- 置顶/置底/上移一层/下移一层

---

## G. View Commands（视图命令）

代码位置：
- `src/editor/plugins/core/createViewCommandsPlugin.ts`

功能：
- zoomIn/out/reset、fit/center view、fit/center selection

---

## H. HUD（UI：右键/工具栏/minimap/缩放条/标尺）

目录：
- `src/editor/plugins/hud/`

原则：
- HUD 只做 UI + 触发 command（不要把核心逻辑写在 UI 里）

