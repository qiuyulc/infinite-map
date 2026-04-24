# 33. 注释版：createDefaultEditorPlugins.ts（为什么插件要这样排序）

对应文件：

- `packages/infinite-map-editor/src/editor/createDefaultEditorPlugins.ts`

这页回答你最常问的一个问题：

> 为什么插件要按这个顺序排列？换一下会怎样？

---

## 1）默认插件集合在干嘛？

它把一堆“功能插件”拼成一个开箱即用的编辑器。

你在文件里能看到几类开关：

- `clipboardEnabled`
- `marqueeEnabled / marqueeRequireShift`
- `shortcutOverrides`

> 如果你想控制 minimap / rulers / toolbar / contextMenu / zoomDock 这类“HUD/UI”开关，它们在 `@qiuyulc/infinite-map-editor` 的 `createDefaultEditorPluginsWithUI()` 里。

补充：`createDefaultEditorPlugins()` / `createDefaultEditorPluginsWithUI()` 的参数现在按“插件名分组”（例如 `snap/view/toolbar/...`），便于透传到对应插件工厂。

这些开关最终只影响一件事：

> **plugins 数组里 push 不 push 某个插件**

---

## 2）最重要的是：顺序 = 优先级

源码里（简化后的顺序）大概是：

```ts
[
  createKeyboardStatePlugin(),
  createCoreServicesPlugin(),
  createCommandRunnerPlugin(),
  createShortcutsPlugin(),
  createHistoryPlugin(),
  createViewCommandsPlugin(),
  createZIndexPlugin(),
  createSnapGuidesPlugin(),
  createRotate3DPlugin(),
  createSelectionPlugin(),
  createClipboardPlugin(),
  createRotatePlugin(),
  createResizePlugin(),
  createDragPlugin(),
  // hud：toolbar/zoomDock/contextMenu/rulers/minimap
  // marquee：放最后
]
```

### 为什么 resize 必须在 drag 前面？

因为 resize handle 是一个更“具体”的意图：

- 你按在 handle 上 → 你就是想 resize
- 如果 drag 先处理了 pointerdown，它可能会直接开始拖拽节点，导致 resize 永远触发不了

所以：**越具体、越应该先抢事件**。

### 为什么 marquee（框选）要放最后？

因为框选是最“泛化”的动作：

- 只要你在空白处拖，就可能触发
- 但很多情况下你其实是想：平移（Space+拖）或者拖节点、拉伸节点

所以框选必须在最后兜底，避免抢走更具体的交互。

---

## 3）HUD 插件为什么都放后面？

HUD（工具栏/右键/minimap/标尺/缩放条）大多数是 UI 展示层：

- 它们不应该影响节点的拖拽/框选输入
- 所以它们一般不抢 pointer 事件（或者只在自己的 UI 区域内抢）

---

## 4）你调顺序时怎么验证不会坏？

建议你每次改顺序都做这组手工测试：

1) resize handle 是否还能正常拉伸  
2) 节点拖拽是否正常  
3) 空白处拖拽是否是框选（或平移）  
4) 右键菜单是否还能打开  
5) 快捷键是否还能触发命令  
