# Editor 插件（默认集合）（阶段 1）

默认插件集合入口：

- `packages/infinite-map/src/editor/createDefaultEditorPlugins.ts`

## 默认开关（现状）

- `marqueeEnabled` / `marqueeRequireShift`
- `rulersEnabled`
- `minimapEnabled`
- `zoomDockEnabled`
- `clipboardEnabled`
- `toolbarEnabled`
- `contextMenuEnabled`
- `shortcutOverrides`

## 插件列表（按装配顺序）

> 顺序非常重要：决定了输入优先级、overlay 层级等。

大致包括：

- core：keyboard-state / core-services / command-runner / shortcuts / history / view-commands / z-index
- snapping：snap-guides
- transform：rotate3d / rotate / resize / drag
- selection：selection
- clipboard：clipboard（可选）
- hud：toolbar（可选）/ zoomDock（可选）/ contextMenu（可选）/ rulers / minimap

后续阶段建议补：每个插件提供的 service/command、以及它依赖的 store keys。

