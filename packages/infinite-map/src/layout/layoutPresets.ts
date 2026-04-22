import type { NodeData } from '../core/types';

type RNG = () => number;

function mulberry32(seed: number): RNG {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export type LayoutPreset = 'grid' | 'random' | 'custom';

export type LayoutOptions = {
  seed?: number;
  grid?: { gap?: number };
  random?: { spanX?: number; spanY?: number };
  custom?: Record<string, { x: number; y: number }>;
};

export function computeLayout(nodes: NodeData[], preset: LayoutPreset, opts: LayoutOptions = {}): NodeData[] {
  switch (preset) {
    case 'grid':
      return layoutGrid(nodes, opts.grid);
    case 'random':
      return layoutRandom(nodes, opts.seed ?? 1, opts.random);
    case 'custom':
      return layoutCustom(nodes, opts.custom);
  }
}

function layoutGrid(nodes: NodeData[], o?: { gap?: number }) {
  const gap = o?.gap ?? 28;
  const maxW = Math.max(...nodes.map((n) => n.width));
  const maxH = Math.max(...nodes.map((n) => n.height));
  const colW = maxW + gap;
  const rowH = maxH + gap;
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));

  // 居中布局
  const totalW = cols * colW - gap;
  const rows = Math.ceil(nodes.length / cols);
  const totalH = rows * rowH - gap;
  const ox = -totalW / 2;
  const oy = -totalH / 2;

  return nodes.map((n, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return { ...n, x: ox + c * colW, y: oy + r * rowH };
  });
}

function layoutRandom(nodes: NodeData[], seed: number, o?: { spanX?: number; spanY?: number }) {
  const rand = mulberry32(seed);
  let spanX = o?.spanX ?? 1400;
  let spanY = o?.spanY ?? 900;

  // 简单碰撞检测：用空间哈希避免 O(n^2) 全量比较
  const padding = 18; // 节点间最小间隔（世界坐标）
  const maxW = Math.max(...nodes.map((n) => n.width));
  const maxH = Math.max(...nodes.map((n) => n.height));
  const cellSize = Math.max(80, Math.max(maxW, maxH) + padding * 2);

  type Rect = { x: number; y: number; w: number; h: number };
  const rects: Rect[] = [];
  const hash = new Map<string, number[]>();

  const keyOf = (cx: number, cy: number) => `${cx},${cy}`;
  const cellRange = (r: Rect) => {
    const x0 = Math.floor(r.x / cellSize);
    const x1 = Math.floor((r.x + r.w) / cellSize);
    const y0 = Math.floor(r.y / cellSize);
    const y1 = Math.floor((r.y + r.h) / cellSize);
    return { x0, x1, y0, y1 };
  };
  const insert = (idx: number, r: Rect) => {
    const { x0, x1, y0, y1 } = cellRange(r);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const k = keyOf(cx, cy);
        const arr = hash.get(k);
        if (arr) arr.push(idx);
        else hash.set(k, [idx]);
      }
    }
  };
  const overlaps = (a: Rect, b: Rect) => {
    return !(
      a.x + a.w + padding < b.x ||
      b.x + b.w + padding < a.x ||
      a.y + a.h + padding < b.y ||
      b.y + b.h + padding < a.y
    );
  };
  const canPlace = (r: Rect) => {
    const { x0, x1, y0, y1 } = cellRange(r);
    for (let cy = y0 - 1; cy <= y1 + 1; cy++) {
      for (let cx = x0 - 1; cx <= x1 + 1; cx++) {
        const arr = hash.get(keyOf(cx, cy));
        if (!arr) continue;
        for (const j of arr) {
          if (overlaps(r, rects[j])) return false;
        }
      }
    }
    return true;
  };

  const placed: NodeData[] = [];
  for (const n of nodes) {
    let placedRect: Rect | null = null;

    // 尝试次数：越多节点越密集时越需要增加
    let attempts = 0;
    let maxAttempts = 220;

    // 如果放不下，就逐步扩大散布范围
    while (!placedRect) {
      attempts++;
      if (attempts > maxAttempts) {
        // 扩大范围后继续尝试
        spanX *= 1.18;
        spanY *= 1.18;
        attempts = 0;
        maxAttempts = Math.min(420, Math.floor(maxAttempts * 1.2));
      }

      const x = (rand() - 0.5) * spanX;
      const y = (rand() - 0.5) * spanY;
      const r: Rect = { x, y, w: n.width, h: n.height };
      if (rects.length === 0 || canPlace(r)) placedRect = r;

      // 安全兜底：极端情况下避免死循环（比如节点数量特别大）
      if (spanX > 20000 || spanY > 20000) {
        placedRect = r;
      }
    }

    const idx = rects.length;
    rects.push(placedRect);
    insert(idx, placedRect);
    placed.push({ ...n, x: placedRect.x, y: placedRect.y });
  }

  return placed;
}

function layoutCustom(nodes: NodeData[], map?: Record<string, { x: number; y: number }>) {
  if (!map) return nodes;
  return nodes.map((n) => {
    const p = map[n.id];
    if (!p) return n;
    return { ...n, x: p.x, y: p.y };
  });
}

