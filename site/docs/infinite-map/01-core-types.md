---
slug: /infinite-map/01-core-types
---

# 1. 核心类型 & 几何

> 涉及的源文件：`core/types.ts`、`core/spatialIndex.ts`、`core/steps.ts`、`core/utils.ts`
>
> 这四个文件构成了 infinite-map 的最底层——零 React 依赖，纯函数。

---

## 1.1 Camera — 相机模型

```ts
// core/types.ts
type Camera = {
  x: number;   // 世界坐标中视口左上角的 X 位置
  y: number;   // 世界坐标中视口左上角的 Y 位置
  zoom: number; // 缩放倍率，1 = 100%
};
```

**语义解释：**

想象你透过一个取景框（视口）看一张无限大的纸（世界坐标）。

```
                 世界坐标系 (World)
         0 ────────────────────────────→ X
         │
         │    ┌─────────────┐  ← 视口 (viewport)
         │    │             │     屏幕像素区域
         │    │   可见区域   │     宽 viewport.w，高 viewport.h
         │    │             │
         │    └─────────────┘
         │    ↑
         │  (camera.x, camera.y) ← 视口左上角在世界中的位置
         ↓
         Y
```

- 当用户向右拖动画面，`camera.x` 增大（视口在世界中向右移动）
- 当用户放大（zoom in），`camera.zoom` 增大（每世界单位占更多像素）

**核心变换公式：**

```
世界坐标 → 屏幕坐标：screenX = (worldX - camera.x) × zoom
屏幕坐标 → 世界坐标：worldX = camera.x + screenX / zoom
```

这个公式在 `useCoordinateTransforms` 中封装，被所有坐标相关逻辑使用。

---

## 1.2 NodeData — 节点数据结构

```ts
// core/types.ts
type NodeData = {
  // === 必填：几何 ===
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // === 层级 ===
  z?: number;           // 默认 0，越大越靠上

  // === 旋转 ===
  rotation?: number;    // 2D 旋转角度（度，顺时针）
  rotationX?: number;   // 3D 旋转：绕 X 轴
  rotationY?: number;   // 3D 旋转：绕 Y 轴

  // === 显示 ===
  label?: string;       // 节点标题
  color?: string;       // 节点颜色

  // === 编组 ===
  kind?: 'node' | 'group';  // 节点种类
  parentId?: string;        // 父组 id

  // === 数据存储 ===
  resourceId?: string;  // 外置数据引用 id（用于大对象）
  data?: unknown;        // 业务自定义数据（不放超大对象）

  // === 编辑器状态 ===
  locked?: boolean;     // 锁定（传递：祖先 locked → 后代视为 locked）
  hidden?: boolean;     // 隐藏（传递：祖先 hidden → 后代视为 hidden）
};
```

**设计原则：**

1. **几何与业务分离**：位置/尺寸放在顶级字段，业务数据放在 `data` 或通过 `resourceId` 外置
2. **传递规则**：`locked` 和 `hidden` 不隔离看待——祖先 locked 则所有后代在编辑行为上等同 locked
3. **id 是唯一主键**：所有编辑操作（move/set/add/remove）都通过 id 定位

---

## 1.3 Rect & 碰撞检测

```ts
// core/types.ts
type Rect = { x: number; y: number; w: number; h: number };

function rectIntersects(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.w < b.x ||   // a 在 b 左边
    b.x + b.w < a.x ||   // b 在 a 左边
    a.y + a.h < b.y ||   // a 在 b 上边
    b.y + b.h < a.y      // b 在 a 上边
  );
}
```

用 "四个不重叠条件取反" 判断两个矩形是否相交。用于虚拟化筛选（节点是否在视口内）和命中检测。

---

## 1.4 空间索引 (Spatial Index)

**文件：** `core/spatialIndex.ts`

**问题：** 有 10000 个节点，视口只能看到其中 50 个。遍历所有节点检查是否在视口内 → O(n)，太慢。

**方案：** 把世界划分成均匀网格，每个节点根据其位置"登记"到对应的格子中。查询时只检查视口覆盖到的格子。

```
世界划分成 cellSize × cellSize 的格子：

┌─────┬─────┬─────┬─────┐
│     │  N1 │  N1 │     │   N1 横跨 2 个格子
│     │  N2 │     │     │   N2 只在 1 个格子
├─────┼─────┼─────┼─────┤
│  N3 │  N3 │     │     │
│     │     │     │     │
├─────┼─────┼─────┼─────┤
│     │     │     │     │
└─────┴─────┴─────┴─────┘

查询视口矩形时，只扫描覆盖到的格子
```

**实现：**

```ts
// 构建索引 O(n)
function buildSpatialIndex(nodes: NodeData[], cellSize = 800): SpatialIndex {
  const grid = new Map<CellKey, string[]>();  // 格子 → 节点 id 列表
  const byId = new Map<string, NodeData>();    // id → 节点数据

  for (const n of nodes) {
    byId.set(n.id, n);

    // 计算节点覆盖了哪些格子
    const minCx = Math.floor(n.x / cellSize);
    const maxCx = Math.floor((n.x + n.width) / cellSize);
    const minCy = Math.floor(n.y / cellSize);
    const maxCy = Math.floor((n.y + n.height) / cellSize);

    // 注册到所有覆盖的格子
    for (let cx = minCx; cx <= maxCx; cx++)
      for (let cy = minCy; cy <= maxCy; cy++)
        grid.get(key(cx, cy))?.push(n.id) ?? grid.set(key(cx, cy), [n.id]);
  }
  return { cellSize, grid, byId };
}

// 查询 O(覆盖格子数 + 候选节点数)
function querySpatialIndex(index: SpatialIndex, rect: Rect): NodeData[] {
  // 1. 计算视口覆盖哪些格子
  const minCx = Math.floor(rect.x / cellSize);
  // ...

  // 2. 收集这些格子里的所有节点 id（去重）
  const ids = new Set<string>();
  for (let cx = minCx; cx <= maxCx; cx++)
    for (let cy = minCy; cy <= maxCy; cy++)
      for (const id of grid.get(key(cx, cy)) ?? [])
        ids.add(id);

  // 3. 返回节点数据
  return [...ids].map(id => byId.get(id)!).filter(Boolean);
}
```

**性能特征：**

- 构建：O(n)，每个节点遍历一次
- 查询：O(k + m)，k = 覆盖格子数，m = 候选节点数
- 默认 `cellSize = 900`（世界单位），在节点均匀分布时效果最好

---

## 1.5 自适应步长算法

**文件：** `core/steps.ts`

**问题：** 标尺刻度、网格间距需要在不同缩放级别下保持视觉密度稳定。zoom=0.5 时应看到 100 的刻度，zoom=2.0 时应看到 25 的刻度。

**算法：**

```
步骤 1：niceStep(raw)
  将任意数值规整到 1/2/5 × 10ⁿ
  例如：38 → 50, 73 → 100, 0.023 → 0.02

步骤 2：computeAdaptiveSteps(zoom)
  1. 根据 zoom 计算目标像素间距 majorTargetPx
  2. 转换为世界间距：majorStepWorld = niceStep(majorTargetPx / zoom)
  3. 计算小刻度：minorStepWorld = majorStepWorld / minorCount
```

**核心函数 `niceStep`：**

```ts
function niceStep(raw: number): number {
  if (!isFinite(raw) || raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));  // 数量级
  const n = raw / pow;  // 归一化到 [1, 10)
  if (n <= 1) return 1 * pow;   // 1, 10, 100, ...
  if (n <= 2) return 2 * pow;   // 2, 20, 200, ...
  if (n <= 5) return 5 * pow;   // 5, 50, 500, ...
  return 10 * pow;              // 10, 100, 1000, ...
}
```

**效果示例：**

| zoom | majorTargetPx | majorStepWorld | 刻度线像素间距 | 视觉效果 |
|---|---|---|---|---|
| 0.5 | 140 | 200 | 100px | 稀疏，显示大刻度 |
| 1.0 | 84 | 100 | 100px | 适中 |
| 2.0 | 52 | 25 | 50px | 密集，显示小刻度 |

**用途：**
- 标尺刻度线（顶部/左侧）
- 网格背景线间距
- 网格吸附步长
- 点阵背景间距

---

## 1.6 工具函数

**文件：** `core/utils.ts`

### clamp

```ts
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
```

简单的值限制。在缩放边界、透明度计算、坐标转换中广泛使用。

### CSS 变量读取

```ts
// 读取字符串
function cssVar(name: string, fallback: string, el?: Element): string {
  const v = getComputedStyle(el ?? document.documentElement)
             .getPropertyValue(name).trim();
  return v || fallback;
}

// 读取数字
function cssVarNum(name: string, fallback: number, el?: Element): number {
  const n = Number.parseFloat(cssVar(name, String(fallback), el));
  return Number.isFinite(n) ? n : fallback;
}

// 读取 RGB（Canvas 用，需逗号分隔）
function cssVarRgb(name: string, fallback: string, el?: Element): string {
  const raw = cssVar(name, fallback, el);
  // 变量存的是 "55 90 110"，Canvas 的 rgba() 需要 "55, 90, 110"
  return raw.includes(',') ? raw : raw.replace(/\s+/g, ', ');
}
```

这些函数让渲染层可以通过 CSS 变量定制外观，不需要在 JS 中硬编码颜色。例如鼠标光晕的颜色通过 `--highlight-rgb` 变量控制，标尺颜色通过 `--im-ruler-text` 控制。

---

## 1.7 数据流中的位置

```
core/types.ts
    │
    ├──→ engine/engineStore.ts       (Camera → ViewSnapshot)
    ├──→ editor/types.ts             (NodeData, Camera → NodePatch, MapContext)
    ├──→ components/InfiniteMap.tsx   (NodeData[] → 渲染)
    ├──→ spatialIndex.query → useVisibleNodes (虚拟化)
    └──→ steps.computeAdaptiveSteps → RulersOverlay, BackgroundGrid
```

这四个 `core/` 文件被项目中几乎所有其他文件引用，是整个画布引擎的地基。
