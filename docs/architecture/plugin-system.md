# 插件系统（阶段 1）

> 这一页是“扩展能力”的核心：你想加功能，大多数时候就是加一个插件，或者给现有插件增加 command/service。

## 1. 插件按领域分组（现状）

源码目录：`packages/infinite-map/src/editor/plugins/`

- `core/`：基础设施（services/commands/history/shortcuts/view/z-index…）
- `selection/`：选择/框选
- `transform/`：拖拽/缩放/旋转
- `snapping/`：吸附与辅助线
- `clipboard/`：剪贴板能力
- `hud/`：界面层（toolbar/minimap/rulers/contextmenu/zoomDock）

## 2. 插件之间如何协作？

三种常见方式：

1) **通过 service**
   - 插件 A `registerService('camera', ...)`
   - 插件 B `getService('camera')` 使用

2) **通过 store**
   - 插件 A `store.set(STORE_KEYS.xxx, ...)`
   - 插件 B `store.get/subscribe(...)`

3) **通过 command**
   - 插件 A 注册 `commands['view.zoomIn']`
   - 任何 UI（toolbar/menu/快捷键）都只要触发 commandId

## 3. Overlay slots（叠层）

slot 用于保证视觉与交互层级正确：

- background：背景渲染（网格/点阵）
- overlay：编辑辅助（选框/对齐线）
- hud：UI（minimap/右键菜单/缩放条）

另外 `overlayPointerEvents` 决定 overlay 是否接收指针事件。

