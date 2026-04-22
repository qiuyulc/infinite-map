# 视图 / 相机 / 缩放：功能点到代码的对应关系

这一页从“功能点”出发，把**缩放/平移/适配视图**这一整条链路拆开，并解释为什么代码要这样写（而不是堆在某一个组件里）。

## 你在 UI 上看到的功能点

1) 鼠标滚轮缩放（或触控板缩放）  
2) 工具栏按钮：放大 / 缩小 / 重置缩放（100%）  
3) 视图命令：适配视图 / 原点居中 / 适配选中 / 选中居中  
4) ZoomDock：底部 slider 直接拖动缩放  
5) Minimap：能反映当前 camera（并能拖动 minimap 改 camera）

这些能力在设计上其实都在做同一件事：**改变 Camera（相机）**。

---

## 核心概念：Camera 是一等公民

相关类型定义：

- `packages/infinite-map/src/core/types.ts`：`Camera`（x/y/zoom）

你可以把 camera 理解成：

- `x/y`：当前视口左上角在 world 坐标中的位置
- `zoom`：世界坐标到屏幕像素的缩放倍率

为什么用“左上角 + zoom”的形式？

- **适合用 viewport 来推导可见区域**（world rect）
- **拖拽/平移本质是改 x/y**，缩放本质是改 zoom
- 所有 overlay/hud 都能用同一套 camera 来对齐（selection overlay、minimap、snap guides）

---

## 设计关键：把“触发方式”与“实现方式”解耦

你会发现：缩放可以由很多入口触发（wheel、toolbar、slider、菜单、快捷键），但它们最终都应该落到同一套逻辑上。

所以我们把它拆成三层：

1) **输入层（触发）**：滚轮、拖动 slider、点击按钮  
2) **命令层（语义）**：`view.zoomIn` / `view.fitView` …  
3) **执行层（落地）**：设置 camera（走 camera service 或 bus）

这样写的好处：

- 你以后加一个入口（例如 “Cmd+滚轮” 或 “命令面板”）不用复制相机逻辑
- 你以后替换相机实现（例如加动画、加惯性）只需要改一处

---

## 功能点 A：按钮/快捷键缩放（view commands）

实现文件：

- `packages/infinite-map/src/editor/plugins/core/createViewCommandsPlugin.ts`

这里注册了一组 command：

- `view.zoomIn` / `view.zoomOut` / `view.resetZoom`
- `view.fitView` / `view.centerView`
- `view.fitSelection` / `view.centerSelection`

为什么要用 commands？

- 工具栏、右键菜单、快捷键，都只是“触发 commandId”
- command 里才放“真正的业务动作”（改 camera / fit rect）

### zoom 的边界与手感

在 `createViewCommandsPlugin.ts` 里通过 `STORE_KEYS.viewConfig` 读取限制：

- `minZoom/maxZoom`
- `zoomStep`

为什么把配置写到 store？

- 命令实现不依赖闭包参数，避免插件重建/热更新时状态断裂
- 其他插件/组件也能读取同一个配置（例如 zoomDock）

---

## 功能点 B：滚轮缩放（wheel controls）

实现文件：

- `packages/infinite-map/src/hooks/useWheelControls.ts`

它负责把浏览器 wheel 事件转换成 “缩放/平移”的 camera 变更。

为什么放在 hook 而不是放在 view commands 里？

- wheel 是“输入设备策略”，不同业务可能要：ctrl 才缩放、trackpad 平滑、mac/pc 差异
- command 更像“离散语义动作”（zoomIn 一步），wheel 更像“连续输入”

---

## 功能点 C：ZoomDock（slider 缩放）

实现文件（已抽离为独立 HUD 插件）：

- `packages/infinite-map/src/editor/plugins/hud/createZoomDockPlugin.tsx`

为什么它应该是独立插件，而不是 toolbar 的一部分？

- 它是 HUD 控件，需要和 minimap 布局联动（而 toolbar 的职责是按钮）
- 它订阅 camera 变化来刷新 UI（`camera:changed`），属于“状态可视化”
- 以后你可能想：只开 zoomDock，不开 toolbar，这种组合更自然

### “缩放不漂移”的写法

在 `createZoomDockPlugin.tsx` 中缩放时，做了这件事：

1) 先计算当前视口中心对应的 world 点
2) 改 zoom
3) 重新反推 x/y，使这个 world 点仍然落在视口中心

这样用户拖动 slider 时画面不会“飘走”，编辑器体验更像 Figma/FigJam。

---

## 功能点 D：Minimap 与 camera 的双向绑定

实现文件：

- `packages/infinite-map/src/editor/plugins/hud/MinimapOverlay.tsx`：桥接 `commitCamera`
- `packages/infinite-map/src/components/Minimap.tsx`：canvas 渲染与交互

Minimap 要做两件事：

1) “显示”：根据 camera/viewport 把世界缩到一个小画布上  
2) “控制”：用户拖动 minimap 视口框时，反过来设置 camera

为什么 minimap 里需要 `cameraRef/commitCamera`？

- Canvas 交互事件里不能依赖 React 的闭包值（会过期）
- 用 ref 保存最新 camera，commitCamera 作为稳定函数注入，是最稳的写法

---

## 常见调试方式（维护者视角）

当你发现“缩放不生效/不同步”时，按顺序排查：

1) 是否真的改了 camera（在哪改：wheel / command / zoomDock / minimap）
2) camera service 是否存在（`ctx.getService('camera')`）
3) UI 是否订阅了 `camera:changed`（例如 zoomDock）
4) canvas 是否触发重绘（minimap 依赖 `needsRedraw/themeVersion`）

