# Infinite Map

Infinite Map 是一个 **可扩展的无限画布组件库**，用于构建：
- 白板/画布/流程图/看板等“节点在二维平面编辑”的应用
- 需要高性能渲染与虚拟化的大型节点集合
- 需要把编辑行为抽象成“可重放的 Patch 变更流”的业务（便于持久化与多人协作）

它主要解决的问题：
- **渲染与交互底座**：世界坐标系 + 相机（pan/zoom）+ 背景（网格/点阵）+ 叠层（overlay）
- **性能**：空间索引 + 可选虚拟化 + keepAlive（适合“重组件节点”）
- **编辑器能力可组合**：通过插件系统组合 selection/drag/resize/history/clipboard/HUD 等能力
- **变更流**：通过 `onPatches` 输出细粒度变更，业务侧可做协作/审计/落库

## 从哪里开始

- [快速上手](/library/quickstart)
- [组件 API](/library/component-api)
- [Demo 与本地测试面板](/library/demos)
- [全量功能清单](/功能清单与对外API)

## 本地启动文档

```bash
pnpm -C docs dev
```
