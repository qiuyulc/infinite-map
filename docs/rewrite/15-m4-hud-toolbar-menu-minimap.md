# 15. Milestone 4（Part 2）：HUD（Toolbar / 右键菜单 / Minimap / ZoomDock / Rulers）

有了 Milestone 3 的 command 系统后，HUD 的正确写法就变得非常清晰：

> HUD 只做两件事：**展示** + **触发 commandId**  
> 不要把“真正修改数据的逻辑”写在 HUD 里。

这样你以后才能：

- 换 UI（不动逻辑）
- 加新入口（菜单/按钮/快捷键复用逻辑）
- 让业务方替换默认 HUD（仍复用内核）

---

## Part A：Toolbar（工具栏）

### 目标

- 展示一排按钮：undo/redo、zoom、fit/center、delete…
- 点击按钮执行 command

### 最小结构

```txt
createToolbarPlugin
  overlay（slot=hud）渲染按钮
  按钮 onClick → ctx.runCommand(commandId, { source: 'toolbar' })
```

### 为什么 toolbar 本质是“command 的 UI”？

因为 toolbar 自己不应该知道“怎么缩放/怎么撤销”，只知道触发哪个 id。

---

## Part B：ContextMenu（右键菜单）

### 目标

- 右键打开菜单
- 菜单项分组 + icon + 禁用态
- 点击菜单项触发 command

### 两层拆分（建议）

1) `createContextMenuPlugin`：只负责**何时打开/关闭** + **坐标**（状态层）  
2) `createDefaultContextMenuPlugin`：只负责**渲染默认 UI**（表现层）  

这样业务方想自定义菜单，只换 UI 插件即可。

---

## Part C：Minimap（小地图）

Minimap 需要做两件事：

1) 显示：把“世界”缩到一个小画布里（canvas）
2) 控制：拖动视口框时反向设置 camera

### 为什么 Minimap 用 canvas？

- 小地图需要快速画很多元素（节点点位、视口框）
- canvas 更适合这个场景

### 为什么需要 cameraRef + commitCamera？

因为 canvas 的事件回调不适合依赖 React state 的闭包值（会过期）。

最稳的写法就是：

- 用 ref 保存最新 camera
- commitCamera 作为稳定函数把 next camera 写回 service/bus

---

## Part D：ZoomDock（缩放条）

ZoomDock 是 HUD，但它非常适合做成独立插件：

- 它不是“按钮栏”的一部分
- 它要跟 minimap 联动布局
- 它订阅 camera 变化来同步显示

### 核心体验：缩放不漂移

缩放时保持某个 world 点不动：

- 以视口中心不动（简单）
- 以鼠标点不动（体验更好）

你现在库里的实现属于“编辑器级手感”，值得在面试里讲。

---

## Part E：Rulers（标尺）

标尺是“纯 HUD 表现层”，但它依赖：

- camera（决定刻度）
- viewport（决定可见范围）

所以它非常适合用：

```txt
overlay(slot=hud) + subscribe camera changes
```

---

## 验证清单

1) toolbar 点击 zoomIn 与快捷键 zoomIn 行为一致  
2) 右键菜单的禁用态在“无选中”时正确（例如 delete/bringToFront 灰掉）  
3) minimap 能跟随 camera，且拖动 minimap 能改变 camera  
4) zoomDock：拖动 slider 改 zoom，同时数值显示不抖动  
5) minimap 关闭时 zoomDock 占位到右下角（避免空一块）  

---

## 本章结束：你能讲出来的一句话（面试）

> 我把 HUD 全部设计成 command 的 UI：toolbar/右键菜单/缩放条都只触发 commandId，而真正的数据变更由插件命令实现负责；minimap/标尺作为 HUD overlay 订阅 camera 与 viewport 状态，从而实现可替换 UI、可复用逻辑、以及良好的扩展性。

