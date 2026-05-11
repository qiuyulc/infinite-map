# 4. 渲染管线

> 涉及的源文件：`components/InfiniteMap.tsx`、`components/EngineBackgroundLayer.tsx`、`components/EngineDomNodesLayer.tsx`、`components/RenderPluginOverlays.tsx`
>
> 渲染管线负责把 React 组件树组装成最终的 DOM 层级。

---

## 4.1 DOM 层级结构

`InfiniteMapEngine` 的 JSX 生成的 DOM：

```html
<div ref="containerRef" data-im-theme>          <!-- 根容器 position:relative -->
  <EngineBackgroundLayer />          <!-- z-index:0  背景（subscribe + rAF） -->
  <RenderPluginOverlays slot="background" />   <!-- z-index:1  插件背景层 -->
  <div ref="viewportDomRef" style="transform"> <!-- z-index:2  视口层（有 transform） -->
    <EngineDomNodesLayer />          <!-- 节点 DOM -->
  </div>
  <RenderPluginOverlays slot="overlay" />       <!-- z-index:20 编辑辅助层 -->
  <RenderPluginOverlays slot="hud" />           <!-- z-index:30 界面层 -->
</div>
```

**五层模型：**

| Layer | z-index | 内容 | 渲染方式 | 为什么 |
|---|---|---|---|---|
| 背景 | 0 | 点阵/网格 | subscribe + rAF 写 DOM | camera 变化每帧都要更新 pattern offset |
| 插件背景 | 1 | hover 高亮、自定义背景 | React overlay | 低频变化 |
| 视口 | 2 | 节点 + CSS transform | subscribe + rAF 写 transform | 拖拽/缩放每帧更新 |
| 编辑辅助 | 20 | 选框、对齐线、框选矩形 | React overlay | 随交互变化，但频率可接受 |
| 界面(HUD) | 30 | minimap、标尺、工具栏 | React overlay | 低频变化 |

---

## 4.2 两种渲染路径的选择标准

```
这个 UI 应该走哪条路径？
    │
    ├── 变化频率 > 10fps？
    │   └── YES → subscribe + rAF → 直接操作 DOM
    │       （背景层、视口 transform、标尺刻度）
    │
    └── 变化频率 ≤ 10fps？
        └── YES → React state → Fiber render
            （节点内容、overlay、HUD）
```

---

## 4.3 EngineBackgroundLayer — 背景层

订阅 `engine.store` 的 `view` 字段，rAF 中直接修改 SVG 的 `patternTransform`。

```ts
// 伪代码
store.subscribe(s => s.view.transform, (transform) => {
  requestAnimationFrame(() => {
    // 点阵：修改 SVG pattern 的偏移
    pattern.setAttribute('patternTransform', offset);
  });
});
```

不通过 React 的原因：拖拽平移时每帧都需要更新点阵偏移，走 React 会每秒触发 60 次 Fiber 渲染。

---

## 4.4 EngineDomNodesLayer — 节点层

```ts
// 订阅 visibleNodeIds（虚拟化后的结果）
const ids = useEngineSelector(
  store, s => s.visibleNodeIds,
  (a, b) => shallowEqual(a, b)  // 只有 id 列表变化才重渲染
);

// 渲染可见节点
return ids.map(id => {
  const node = nodesById.get(id);
  return <RenderDomNode key={id} node={node} />;
});
```

**视口层 `<div>` 的 `style.transform` 由 rAF 直接写入，不经 React。** 子节点的定位（left/top）使用的是节点的世界坐标，乘以 zoom 和 camera 偏移后由 `style.transform` 整体处理。

---

## 4.5 RenderPluginOverlays — 插件 UI 层

```tsx
function RenderPluginOverlays({ plugins, slot, ctx }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
      {plugins
        .filter(p => p.enabled !== false && p.slot === slot)
        .map(p => (
          <OverlayErrorBoundary key={p.id}>
            {p.overlay({ ctx })}
          </OverlayErrorBoundary>
        ))}
    </div>
  );
}
```

三层调用的区别只在于 `slot` 参数（`'background'` / `'overlay'` / `'hud'`），每层一个 `<div>` 容器，不同 z-index。

`OverlayErrorBoundary` 保证单个插件的 overlay 渲染崩溃不影响其他插件。
