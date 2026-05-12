---
slug: /
---

import { HomeDemo } from '@site/src/demos/HomeDemo';
import BrowserOnly from '@docusaurus/BrowserOnly';

# Infinite Map

一个可扩展的无限画布组件库：渲染引擎 + 编辑器插件 + Patch 变更流。

---

## 在线体验

<BrowserOnly fallback={<div style={{ height: 420 }} />}>
  {() => <HomeDemo />}
</BrowserOnly>

> 拖拽画面平移、滚轮缩放，体验无限画布的基础交互。

## 快速开始

```bash
pnpm add @qiuyulc/infinite-map @qiuyulc/infinite-map-editor
```

```tsx
import { InfiniteMap } from "@qiuyulc/infinite-map";
import { createDefaultEditorPluginsWithUI } from "@qiuyulc/infinite-map-editor";

<InfiniteMap
  nodes={nodes}
  plugins={createDefaultEditorPluginsWithUI()}
  onNodesChange={setNodes}
/>;
```

→ [编辑器快速上手](/infinite-map-editor/quickstart)

---

## 文档导航

| 想做什么             | 从这里开始                                                    |
| -------------------- | ------------------------------------------------------------- |
| 接入编辑器           | [快速上手](/infinite-map-editor/quickstart)                   |
| 配置编辑器行为       | [插件配置](/infinite-map-editor/plugin-config)                |
| 查快捷键 / 操作      | [操作与快捷键](/infinite-map-editor/shortcuts-and-operations) |
| 理解变更机制         | [编辑与变更流](/infinite-map-editor/editing)                  |
| 定制工具栏/右键菜单  | [编辑器定制](/infinite-map-editor/customization)              |
| 写自定义插件         | [插件开发指南](/infinite-map-editor/plugin-development)       |
| 查插件 API           | [插件 API 参考](/infinite-map-editor/plugin-reference)        |
| 深入核心渲染引擎     | [infinite-map 架构总览](/infinite-map/overview)               |
| 查 NodeData 字段     | [NodeData 节点数据](/library/node-data)                       |
| 查组件 Props         | [InfiniteMap 组件 API](/library/component-api)                |
| 主题 / 持久化 / 协作 | 见侧边栏「编辑器使用」                                        |
| 全量功能清单         | [功能清单与对外 API](/功能清单与对外API)                      |

---

## 本地启动文档

```bash
pnpm dev:docs
```
