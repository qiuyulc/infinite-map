# 架构总览（阶段 1）

这份文档回答三个问题：

1. **这个库的“内核”是什么？**
2. **Editor 的扩展点在哪里？**
3. **一次交互（比如拖拽/右键/缩放）从输入到渲染的链路怎么走？**

## 1. 分层模型（你可以按这个方式理解项目）

```txt
React Components（视图层）
  - InfiniteMap / DefaultNode / Minimap / Slider ...
        ↑
Editor Runtime（编辑器运行时：插件装配 + 输入处理 + 命令）
  - runtime.ts / composePlugins.ts / types.ts
        ↑
Core（数据/算法层）
  - core/types.ts / spatialIndex.ts / utils.ts
```

## 2. 关键对象：MapContext

`MapContext` 是 editor 世界里的“总线”：

- 提供读写：节点数据、相机、视口
- 提供协作机制：`store`（状态仓库）、`bus`（事件总线）
- 提供扩展机制：`services`、`commands`、`plugins overlay slot`

你可以把它理解成：**插件能做什么，取决于 MapContext 暴露了什么能力**。

## 3. 插件系统的能力边界

一个 `InfiniteMapPlugin` 可以提供：

- `handlers`：输入处理（pointer/keyboard/wheel）
- `commands`：命令（可被快捷键、工具栏、右键菜单触发）
- `services`：可被其他插件/组件调用的服务（例如 camera/document/selection）
- `overlay`：可渲染 UI（slot = background / overlay / hud）

详见：[插件系统](./plugin-system)。

## 4. “从输入到渲染”的主链路（概念）

以“拖拽移动节点”为例：

```txt
PointerDown/Move
  → drag plugin handler
  → 计算 patches（NodePatch[]）
  → document.applyPatches(patches, meta)
  → store/bus 通知
  → ctx.requestRender()
  → React 组件更新 / overlay 重绘 / canvas 重绘（如需要）
```

以“缩放”为例：

```txt
wheel/toolbar/zoomDock
  → view command 或直接 set camera
  → camera service.set(nextCamera)
  → bus emit camera:change / camera:changed
  → 相关 overlay（minimap/zoomDock）订阅后刷新
```

接下来建议你按顺序读：

1. [Editor 运行时](./editor-runtime)
2. [命令与快捷键](./commands-and-shortcuts)
3. [核心渲染与数据流](./rendering-and-dataflow)

