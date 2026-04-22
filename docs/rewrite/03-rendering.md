# 03. 渲染层（DOM + Canvas + 叠层）

这一章目标：

> 你能把“背景、节点、辅助层、UI 层”稳定叠起来，并能解释为什么要分层。

---

## 1) 你最终要渲染出什么结构？

文字图：

```txt
InfiniteMap Root（一个 div）
  ├─ background layer（背景：grid/dots）
  ├─ nodes layer（节点：DOM）
  ├─ overlay layer（编辑辅助：选框/吸附线）
  └─ hud layer（UI：toolbar/右键/minimap/zoomDock）
```

关键点：

- background：不应该挡住鼠标
- overlay：大多数时候不挡鼠标（只有少数 handle 需要）
- hud：需要可点击

---

## 2) 为什么节点用 DOM，而 minimap 用 Canvas？

节点用 DOM 的理由：

- 节点内容很可能是业务自定义（文本、按钮、头像）
- DOM 更适合交互与布局

minimap 用 Canvas 的理由：

- 需要画很多小点/小矩形，Canvas 性能更稳
- 并且 minimap 的交互是“在一个小画布里拖拽视口框”

---

## 3) 最小可跑渲染：只做 nodes layer

你从 0 写时，可以先只做：

- root 容器（拿到 viewport 尺寸）
- nodes layer（把 nodes 显示出来）
- camera（默认 zoom=1，x/y=0）

然后再逐步加：

- 背景层
- wheel 缩放（camera.zoom 变化）
- 平移（camera.x/y 变化）
- overlay/hud 插槽（给 editor plugins 用）

---

## 4) 叠层的“最关键规则”

你要能一句话讲清楚：

> UI 层（hud）永远在最上面，编辑辅助层（overlay）在节点上面，但默认不吃事件。

这条规则如果不明确，后面加右键菜单/缩放条/选框时就会互相抢事件导致乱套。

下一章我们讲：Editor Runtime 怎么把插件装配进来（也就是“编辑能力从哪来”）。

