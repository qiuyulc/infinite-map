# 核心渲染与数据流（阶段 1）

> 这一页的目标：回答“画布是怎么渲染的？overlay/hud 怎么叠层？为什么某些 UI 要手动重绘？”

## 1. 视图分层（slots）

插件 overlay 支持 slot：

- `background`：背景层（在节点之下）
- `overlay`：编辑辅助层（选框/对齐线/框选等）
- `hud`：界面层（minimap/标尺/面板等）

`InfiniteMap` 会把不同 slot 的 overlay 渲染到不同层级，从而避免互相干扰。

## 2. 两种“渲染方式”

项目里同时存在两类渲染：

### 2.1 React DOM 渲染（适合 UI）

典型：Toolbar、右键菜单、ZoomDock、Rulers（overlay 中的 DOM）

优点：响应式、易扩展、易主题化。

### 2.2 Canvas 渲染（适合大量元素/特殊效果）

典型：Minimap、Highlight layer（`useHighlightLayer`）

注意点：Canvas 不会因为 CSS 变量变化而自动重绘，所以需要：

- 主题切换时触发“重绘信号”（`useThemeVersion`）
- 或者在输入/相机变化时主动 `needsRedraw`

## 3. 主题与 CSS Variables 的传递

本项目的主题不是写在 `:root`，而是由 `InfiniteMapThemeProvider` 写在**局部容器**上。  
因此：

- DOM 样式：直接用 `var(--im-xxx)` 即可被继承到
- Canvas 样式：需要用 `getComputedStyle(canvas).getPropertyValue('--im-xxx')` 读取（不要只从 `documentElement` 读）

