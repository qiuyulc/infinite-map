import { describe, expect, it } from 'vitest';
import type { NodeData } from '../core/types';
import { rectIntersects } from '../core/types';
import { buildSpatialIndex, querySpatialIndex } from '../core/spatialIndex';

describe('spatialIndex', () => {
  it('queries nodes by uniform grid cells', () => {
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 10, height: 10 },
      { id: 'b', x: 1000, y: 0, width: 10, height: 10 },
      { id: 'c', x: 50, y: 50, width: 10, height: 10 },
    ];
    const index = buildSpatialIndex(nodes, 100);

    // querySpatialIndex 返回“候选节点”（同格子内可能有误报），需要额外做 rectIntersects 过滤
    const rect1 = { x: -5, y: -5, w: 30, h: 30 };
    const candidates1 = querySpatialIndex(index, rect1).map((n) => n.id);
    // a 与 c 在同一个格子（0,0），因此 candidates 会包含 c
    expect(new Set(candidates1)).toEqual(new Set(['a', 'c']));
    const exact1 = querySpatialIndex(index, rect1)
      .filter((n) => rectIntersects(rect1, { x: n.x, y: n.y, w: n.width, h: n.height }))
      .map((n) => n.id);
    expect(new Set(exact1)).toEqual(new Set(['a']));

    const rect2 = { x: 40, y: 40, w: 40, h: 40 };
    const candidates2 = querySpatialIndex(index, rect2).map((n) => n.id);
    // rect2 仍然落在 (0,0) 这个格子内，因此 candidates 包含 a/c
    expect(new Set(candidates2)).toEqual(new Set(['a', 'c']));
    const exact2 = querySpatialIndex(index, rect2)
      .filter((n) => rectIntersects(rect2, { x: n.x, y: n.y, w: n.width, h: n.height }))
      .map((n) => n.id);
    expect(new Set(exact2)).toEqual(new Set(['c']));

    const hits3 = querySpatialIndex(index, { x: 900, y: -10, w: 200, h: 40 }).map((n) => n.id);
    expect(new Set(hits3)).toEqual(new Set(['b']));
  });
});
