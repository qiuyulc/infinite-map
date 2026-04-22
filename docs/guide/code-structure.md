# 代码结构导航（阶段 1）

目标：当你想“改一个功能”时，能快速定位到**哪个目录/文件**。

> 源码根目录：`packages/infinite-map/src`

## 1. 入口与主题

- `src/index.ts`：库公开导出（对外 API 从这里开始追）
- `src/theme.ts`：主题 token、`themeToCSSVars`、默认 light/dark theme
- `src/components/InfiniteMapThemeProvider.tsx`：把 CSS vars 写到局部容器（不是 :root）

## 2. 核心组件（components）

目录：`src/components/`

- `InfiniteMap.tsx`：画布主组件（挂载渲染层 + 编辑器 runtime + overlay/hud 插槽）
- `DefaultNode.tsx` + `DefaultNode.css`：默认节点 UI
- `Minimap.tsx`：Canvas minimap 渲染（主题/高亮）
- `Slider.tsx` + `Slider.css`：自研 slider（被 zoom dock 使用）
- `BackgroundGrid.tsx` / `BackgroundDots.tsx`：背景渲染

## 3. core（与 UI 无关的底层）

目录：`src/core/`

- `types.ts`：`NodeData`/`Camera` 等核心类型
- `utils.ts`：小工具（包含 cssVar 读取等）
- `spatialIndex.ts`：空间索引（性能相关）
- `steps.ts`：一些步骤/常量（按实际内容补充）

## 4. hooks（React hooks）

目录：`src/hooks/`

- `useCamera.ts`：相机相关 hook
- `useWheelControls.ts`：滚轮/缩放交互
- `usePointerPan.tsx`：指针平移交互
- `useVisibleNodes.ts`：可见节点计算
- `useViewportSize.ts`：容器尺寸
- `useThemeVersion.ts`：主题版本号（用于触发 canvas 重绘）
- `useHighlightLayer.ts`：canvas 高亮层

## 5. editor（插件化编辑器）

目录：`src/editor/`

### 5.1 运行时与组合

- `types.ts`：Editor 侧核心类型（`MapContext`、`InfiniteMapPlugin`、`Command` 等）
- `runtime.ts`：把 plugins “装配”到运行时（handlers/overlay/commands/services）
- `composePlugins.ts`：插件排序、依赖处理（如果有）
- `createDefaultEditorPlugins.ts`：默认插件集合（开关都在这里）
- `keys.ts`：store keys（插件之间共享状态的命名空间）
- `snapUtils.ts`：吸附算法/工具

### 5.2 plugins（按领域分组）

目录：`src/editor/plugins/`

- `core/`：基础设施（services/commands/history/shortcuts/view/z-index…）
- `selection/`：选择与框选（SelectionOverlay 等）
- `transform/`：拖拽/缩放/旋转（drag/resize/rotate/rotate3d）
- `snapping/`：吸附与辅助线（SnapGuidesOverlay）
- `clipboard/`：剪贴板
- `hud/`：界面层（toolbar/minimap/rulers/contextmenu/zoomDock）

