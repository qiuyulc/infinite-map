# 00. 阅读地图（先看哪里）

你现在的目标不是“懂所有代码”，而是先把项目拆成几块：**它们分别负责什么**，以及**你该从哪里开始看**。

## 项目到底有几部分？

```txt
infinite-map-monorepo/
  packages/infinite-map/   ← 这是三方库本体（你要维护的核心）
  playground/              ← 演示站（最好的“运行中的示例”）
  docs/                    ← 文档站（你正在看的）
```

你只要记住一句话：

> 想知道“怎么用”就看 playground；想知道“怎么实现”就看 packages/infinite-map。

---

## 从 0 到 1 的阅读顺序（强烈推荐按这个走）

### 第 1 个文件：playground 的入口（最直观）

打开：

- `playground/src/App.tsx`

你要找三件事：

1. 它给 `<InfiniteMap />` 传了什么 `nodes`
2. 它给 `<InfiniteMap />` 传了什么 `plugins`
3. 它怎么切换主题/背景（因为你 UI 上看到的变化都从这里来）

### 第 2 个文件：库的入口（对外 API）

打开：

- `packages/infinite-map/src/index.ts`

你会看到所有对外导出（你在业务项目里 import 的东西）。

### 第 3 个文件：画布主组件（“画布是怎么画出来的”）

打开：

- `packages/infinite-map/src/components/InfiniteMap.tsx`

这个文件是整个项目的“中心控制台”：

- 背景（网格/点阵）
- 节点渲染
- 把编辑器插件的 overlay/hud 叠上去（toolbar、右键、minimap…）

### 第 4 个文件：默认编辑器插件集合（“编辑能力从哪里来”）

打开：

- `packages/infinite-map/src/editor/createDefaultEditorPlugins.ts`

你会看到：框选、拖拽、缩放、右键菜单、minimap、zoom slider… 这些能力是通过插件组合出来的。

---

## 先建立一个“脑内图”（不用懂细节）

你可以先把整个库想成 3 层：

```txt
第 1 层：React UI（看得见的东西）
  InfiniteMap / Toolbar / ContextMenu / ZoomDock / Minimap ...

第 2 层：Editor（编辑能力）
  plugins：selection / drag / resize / snapping / history / clipboard ...

第 3 层：Core（数据与算法）
  NodeData / Camera / 坐标换算 / 空间索引 ...
```

后面每一章都会只讲其中一块，并配上“你可以复制运行的最小代码”。

