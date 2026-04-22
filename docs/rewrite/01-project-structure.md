# 01. 项目结构与分层（你该怎么开始写）

这一章目标：

> 当你准备从 0 开始敲代码时，你知道“先建哪些文件/目录”，以及每一层负责什么。

---

## 1) 先做“最小能跑”的骨架

你先把工程跑起来（monorepo + playground + docs），然后从库里导出一个最简单的组件：

### 最小骨架（不含 editor）

```
packages/infinite-map/src/
  index.ts
  components/InfiniteMap.tsx
  core/types.ts
```

你第一天只需要实现：`<InfiniteMap nodes={...} />` 能把 nodes 画出来。

---

## 2) 分层规则（写代码时强制遵守）

### core（最底层）

- 只能是：类型、算法、纯函数
- 尽量不要 import React

为什么？

- core 越纯，越好测、越可复用、越像“库能力”（面试亮点）

### editor（中间层）

- 负责：插件协议、输入分发、命令系统、状态共享
- 尽量不要渲染复杂 UI（HUD 用 overlay 输出）

### components/hooks（顶层）

- 负责：React 渲染、DOM/canvas、用户交互体验

---

## 3) 你写每个功能时的“标准模板”

以后你加任何功能，都用这个模板写（这能强制让你不乱）：

1) 用户行为：用户做了什么（点击、拖拽、滚轮、右键）  
2) 数据变化：哪些字段变了（nodes/camera/store）  
3) 负责模块：这个变化应该归哪个层/哪个文件  
4) 验证方式：你怎么证明它对（playground 一个按钮/一次操作）

---

## 4) “我该从哪里开始写”推荐顺序

按最少依赖 → 最能看到结果：

1) `core/types.ts`：定义 `NodeData`、`Camera`
2) `components/InfiniteMap.tsx`：把 nodes 渲染出来（先不做编辑）
3) `hooks/useViewportSize.ts`：拿容器尺寸
4) `hooks/useWheelControls.ts`：先把缩放做出来（你会立刻看到变化）
5) `editor`：再加入 plugin runtime（把编辑能力“装配”进去）

下一章我们会把核心数据模型（Node/Camera/Patch）写清楚，并给出“你应该怎么设计它们”的理由。

