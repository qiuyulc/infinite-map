import type { NodeData, Rect } from './types';

type CellKey = string;

function key(cx: number, cy: number): CellKey {
  return `${cx},${cy}`;
}

export type SpatialIndex = {
  cellSize: number;
  grid: Map<CellKey, string[]>;
  byId: Map<string, NodeData>;
};

/**
 * 轻量均匀网格索引：适合“节点虚拟化”（视口裁剪）快速筛选候选节点。
 * - 构建 O(n)
 * - 查询 O(覆盖到的格子数 + 候选节点数)
 */
export function buildSpatialIndex(nodes: NodeData[], cellSize = 800): SpatialIndex {
  const grid = new Map<CellKey, string[]>();
  const byId = new Map<string, NodeData>();

  for (const n of nodes) {
    byId.set(n.id, n);
    const minCx = Math.floor(n.x / cellSize);
    const maxCx = Math.floor((n.x + n.width) / cellSize);
    const minCy = Math.floor(n.y / cellSize);
    const maxCy = Math.floor((n.y + n.height) / cellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const k = key(cx, cy);
        const arr = grid.get(k);
        if (arr) arr.push(n.id);
        else grid.set(k, [n.id]);
      }
    }
  }

  return { cellSize, grid, byId };
}

export function querySpatialIndex(index: SpatialIndex, rect: Rect): NodeData[] {
  const { cellSize, grid, byId } = index;
  const minCx = Math.floor(rect.x / cellSize);
  const maxCx = Math.floor((rect.x + rect.w) / cellSize);
  const minCy = Math.floor(rect.y / cellSize);
  const maxCy = Math.floor((rect.y + rect.h) / cellSize);

  const ids = new Set<string>();
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cy = minCy; cy <= maxCy; cy++) {
      const arr = grid.get(key(cx, cy));
      if (!arr) continue;
      for (const id of arr) ids.add(id);
    }
  }

  const out: NodeData[] = [];
  ids.forEach((id) => {
    const n = byId.get(id);
    if (n) out.push(n);
  });
  return out;
}

