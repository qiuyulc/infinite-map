# 01. nodes 是什么？怎么渲染出来？

这一章目标：你要能回答一句话——

> **nodes 就是一组“方块描述”，InfiniteMap 把它们渲染成 DOM。**

## 第 1 部分：nodes（节点数据）长什么样？

打开类型定义（只看结构，不要怕）：

- `packages/infinite-map/src/core/types.ts`

你会看到 `NodeData`（大概包含）：

- `id`：唯一 id
- `x/y`：位置
- `w/h`：尺寸
- `z`：层级（谁在上面谁在下面）
- 其它业务字段（比如 title、meta）

你现在先记住：**x/y/w/h** 这四个最重要。

## 第 2 部分：InfiniteMap 怎么把 nodes 画出来？

打开：

- `packages/infinite-map/src/components/InfiniteMap.tsx`

在里面搜关键字：

- `nodes`
- `DefaultNode`

你会发现它大致在做：

1) 遍历 `nodes`
2) 计算每个节点应该在屏幕上的位置
3) 渲染一个节点组件（默认是 `DefaultNode`）

## 第 3 部分：DefaultNode 是“默认长相”

打开：

- `packages/infinite-map/src/components/DefaultNode.tsx`
- `packages/infinite-map/src/components/DefaultNode.css`

你会看到：节点样式基本都来自 CSS variables（例如 `--im-node-bg`）。

为什么要用 CSS variables？

- 使用者可以改主题，不用改组件代码

---

## 你可以自己验证一下（最直观）

在 `playground/src/App.tsx` 里点击“随机重排”，发生的事情是：

1) `setNodes(...)` 把 nodes 的 `x/y` 重新生成
2) `<InfiniteMap nodes={nodes} />` 收到新 nodes
3) React 重新渲染 → 你看到节点位置变了

下一章我们讲：插件是什么？为什么拖拽/右键这些功能不是写在 InfiniteMap 里？

