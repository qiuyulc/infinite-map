# 功能清单（阶段 1）

下面按“库能力”而不是按“页面 UI”来整理，方便你快速判断：项目现在到底有哪些功能、缺哪些、扩展点在哪。

> 说明：这里是**现状清单**，不是规划；对应实现位置见 [代码结构导航](./code-structure)。

## 1. 画布与渲染

- 无限画布容器（背景 + 节点层 + overlay/hud）
- 背景模式
  - 网格（grid）
  - 点阵（dots）
- 视口/相机
  - 相机（Camera：x/y/zoom）
  - 视口（Viewport：w/h）
  - world/screen 坐标转换

## 2. 节点（Node）

- 基础节点数据结构 `NodeData`（位置/尺寸/z 等）
- 默认节点渲染器 `DefaultNode`
  - 基于 CSS vars 的主题化（`--im-node-*`）

## 3. Editor（可选）能力：插件化编辑器

> Editor 不是强耦合在渲染里，而是通过 plugins 注入输入处理、命令、hud 等。

### 3.1 选择/框选

- 单选/多选逻辑
- 框选（marquee select）
- Selection overlay（选中框 UI）

### 3.2 变换（Transform）

- 拖拽移动（drag）
- 缩放/调整大小（resize）
- 旋转（rotate）
- 3D 旋转（rotate3d，Alt/Option + drag）

### 3.3 吸附（Snapping）

- 网格吸附与阈值
- 吸附辅助线（snap guides overlay）

### 3.4 历史（History）

- undo / redo
- 对 patches 的聚合/提交策略（详见架构文档）

### 3.5 剪贴板（Clipboard）

- copy / cut / paste / duplicate
- 右键菜单支持

### 3.6 Z 轴层级（ZIndex）

- 置于顶层 / 置于底层
- 上移一层 / 下移一层
- normalize（重新整理 z）

### 3.7 View 命令（View Commands）

- zoom in / zoom out / reset zoom
- fit view / center view
- fit selection / center selection

## 4. HUD（界面层）插件

- Toolbar（工具栏）
- Context menu（右键菜单，中文 + icon + 边界约束）
- Minimap（小地图，支持主题切换重绘）
- Rulers（标尺）
- Zoom dock（缩放滑杆：与 minimap 联动布局）

## 5. 主题与样式

- `InfiniteMapThemeProvider`：通过局部 CSS variables 提供主题
- `themeToCSSVars`：主题对象 → `--im-*` 变量映射
- Canvas 侧（minimap/高亮）会读取 CSS vars 并在主题切换时重绘

