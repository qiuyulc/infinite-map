# MiniMap 实现目标

目标：从 0 实现一个最小版无限画布，用来理解核心功能，不追求完整编辑器能力。

## 阶段 1：只读画布

- 定义 `Camera`：`x`、`y`、`zoom`。
- 定义 `NodeData`：`id`、`x`、`y`、`width`、`height`、`label`。
- 渲染一组节点。
- 使用世界坐标定位节点。
- 使用一个 viewport 层承载所有节点。
- 根据 camera 计算 viewport 的 `transform`。

## 阶段 2：画布平移

- 支持按住空白区域拖动画布。
- pointer down 记录起点。
- pointer move 更新 camera 的 `x/y`。
- pointer up / cancel 结束拖动。
- 拖动时不移动单个节点，只移动整个 viewport。

## 阶段 3：缩放

- 支持滚轮缩放。
- 设置最小缩放和最大缩放。
- 缩放时保持鼠标所在世界坐标尽量不漂移。
- 实现 `screenToWorld`。
- 实现 `worldToScreen`。

## 阶段 4：命中测试

- 点击时判断命中的是节点还是空白。
- 从上到下命中节点。
- 节点命中使用世界坐标判断。
- 空白命中用于画布平移。

## 阶段 5：选择节点

- 点击节点选中。
- 点击空白清空选择。
- 被选中节点显示选中态。
- 支持保存 `selectedIds`。

## 阶段 6：拖拽节点

- 按住节点时拖动节点。
- 按住空白时拖动画布。
- 拖动节点时根据 camera zoom 换算位移。
- 拖动结束后更新节点坐标。

## 阶段 7：抽象输入流程

- 把输入流程整理成：`hitTest -> gesture`。
- 实现两个 gesture：
  - `pan`
  - `dragNode`
- 每个 gesture 包含：
  - `canStart`
  - `onStart`
  - `onMove`
  - `onEnd`
  - `onCancel`

## 阶段 8：Patch 数据变更

- 定义 `NodePatch`。
- 支持 `move` patch。
- 通过 `applyPatches` 更新 nodes。
- 拖拽节点时不直接改 nodes，而是生成 patch。

## 阶段 9：插件雏形

- 定义最小 `Plugin` 类型。
- 插件可以提供 gesture。
- 插件可以提供 hitTest。
- 用插件方式实现 pan 和 dragNode。

## 暂时不做

- undo / redo
- resize
- rotate
- minimap
- rulers
- toolbar
- context menu
- snap guides
- group
- lock / hide
- clipboard
- doc 导入导出
- theme 系统
- 虚拟化

## 最终目标

完成后应该能理解：

- 世界坐标是什么。
- camera 如何控制画布。
- pan / zoom 为什么只需要改 viewport transform。
- screen 坐标和 world 坐标如何转换。
- hitTest 如何决定当前操作目标。
- gesture 如何区分拖画布和拖节点。
- patch 为什么比直接改节点更适合扩展编辑器能力。
