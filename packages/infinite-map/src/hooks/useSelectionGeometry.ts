import { useCallback } from 'react';
import type { NodeData, Rect } from '../core/types';
import type { MapContext } from '../editor/types';

const unionRect = (a: Rect, b: Rect): Rect => {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
};

/**
 * 选区几何工具：
 * - getNodeRect：节点 axis-aligned bbox（world 坐标）
 * - getSelectionRect：selection ids 的 bbox（world 坐标）
 */
export function useSelectionGeometry({
  nodesRef,
  ctx,
}: {
  nodesRef: React.MutableRefObject<NodeData[]>;
  ctx: MapContext;
}) {
  const getNodeRect = useCallback((id: string): Rect | null => {
    const n = nodesRef.current.find((x) => x.id === id);
    if (!n) return null;
    return { x: n.x, y: n.y, w: n.width, h: n.height };
  }, [nodesRef]);

  const getSelectionRect = useCallback((): Rect | null => {
    const ids = ctx.getService<{ getIds: () => string[] }>('selection')?.getIds?.() ?? [];
    if (ids.length === 0) return null;
    let out: Rect | null = null;
    for (const id of ids) {
      const r = getNodeRect(id);
      if (!r) continue;
      out = out ? unionRect(out, r) : r;
    }
    return out;
  }, [ctx, getNodeRect]);

  return { getNodeRect, getSelectionRect };
}

