---
slug: /infinite-map/08-virtualization
---

# 8. 虚拟化

> 涉及的源文件：`core/spatialIndex.ts`、`hooks/useVisibleNodes.ts`
>
> 虚拟化保证"视口外节点不渲染"，是支撑大规模节点的性能基础。

---

## 8.1 流程

```
nodes 变化 / camera 变化 / viewport 变化
    │
    ▼
scheduleComputeVisible()
    │ (rAF 去抖)
    ▼
1. 构建/复用空间索引 (buildSpatialIndex)
2. 计算视口世界矩形 (viewWorldRect)
3. querySpatialIndex(索引, 视口矩形) → 候选节点
4. filter by rectIntersects → 精确筛选
5. sort by z
6. 合并 keepAlive 节点
7. 合并 panKeepAlive 节点
8. 更新 visibleNodeIds → engine store
9. EngineDomNodesLayer 只渲染 visibleNodeIds
```

---

## 8.2 overscan

```ts
viewWorldRect = {
  x: cam.x - overscanWorld,   // 向左扩展
  y: cam.y - overscanWorld,   // 向上扩展
  w: vp.w / z + overscan * 2, // 宽度扩展
  h: vp.h / z + overscan * 2  // 高度扩展
};
```

`overscanPx = 900`（默认）。在视口四周多渲染 900px 的节点，防止快速平移时出现"节点闪现"。

---

## 8.3 keepAlive

```ts
virtualization: {
  keepAlive: (node) => node.kind === 'chart'  // 图表节点不卸载
}
```

即使节点移出视口，只要 `keepAlive(node)` 返回 true，节点就不会被卸载。用于"重组件节点"（图表、视频、富文本编辑器）——这些节点重建成本高，保持 DOM 存活比重新挂载更快。

---

## 8.4 panKeepAlive

```ts
// pan 开始时
panKeepAliveAdd(visibleNodesRef.current.map(n => n.id));

// pan 结束时
panKeepAliveIdSetRef.current.clear();
```

pan 期间，移出视口的节点不会被卸载。这避免了"拖动画面时节点在视口边界闪烁"的问题。用 LRU 限制最大缓存节点数（默认 2000）。
