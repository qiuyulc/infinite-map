# 02. 插件是什么？为什么功能不写在一个文件里？

这一章目标：你要能回答一句话——

> **插件就是“一个功能模块”，比如拖拽/框选/右键菜单/小地图，每个都是一个插件。**

## 先看插件列表（最直观）

打开：

- `packages/infinite-map-editor/src/editor/createDefaultEditorPlugins.ts`

你会看到它返回一个数组：

```ts
return [
  createSelectionPlugin(),
  createDragPlugin(),
  createDefaultContextMenuPlugin(),
  createMinimapPlugin(),
  ...
]
```

你可以把它理解成：

> “把这些功能模块装上，编辑器就会有这些能力”

## 为什么不把所有代码写在 InfiniteMap.tsx 里？

因为那样会变成：

- 一个文件几千行
- 功能互相打架（谁先处理鼠标？）
- 很难开关（你想关闭右键菜单就得改核心组件）

插件化的好处（用人话）：

- **要不要这个功能？** → 直接不装这个插件
- **想改这个功能？** → 只改这个插件文件，不会影响别的

## 插件文件都放哪里？

目录：

`packages/infinite-map-editor/src/plugins/`

我们现在采用“按功能点排列”，所以这里没有再分 `transform/selection/hud` 这类子目录，而是直接用文件名表达功能：

- `createDragPlugin.ts`：拖拽
- `createResizePlugin.ts`：缩放
- `createRotatePlugin.ts` / `createRotate3DPlugin.ts`：旋转
- `createSelectionPlugin.tsx` / `createMarqueeSelectPlugin.tsx`：选中/框选
- `createToolbarPlugin.tsx` / `createDefaultContextMenuPlugin.tsx` / `createMinimapPlugin.ts` 等：HUD/UI

下一章我们会选一个具体功能（右键菜单），从“我点右键”开始一步步追代码。
