import { useEffect, useMemo, useRef, useState } from 'react';
import type { Camera, NodeData, Rect } from '../core/types';
import { rectIntersects } from '../core/types';
import { buildSpatialIndex, querySpatialIndex } from '../core/spatialIndex';

type Params = {
  nodes: NodeData[];
  cellSize: number;
  camera: Camera;
  viewport: { w: number; h: number };
  overscanPx: number;
};

/**
 * 可见节点虚拟化（空间索引 + 视口裁剪）
 * - 使用空间索引减少候选数量
 * - 使用 rAF 合并计算，拖动/缩放时更稳
 * - 对结果排序保证 DOM 顺序稳定
 */
export function useVisibleNodes({ nodes, cellSize, camera, viewport, overscanPx }: Params) {
  const index = useMemo(() => buildSpatialIndex(nodes, cellSize), [nodes, cellSize]);

  const viewWorldRect: Rect = useMemo(() => {
    const z = camera.zoom;
    const worldW = viewport.w / z;
    const worldH = viewport.h / z;
    const overscanWorld = overscanPx / z;
    return {
      x: camera.x - overscanWorld,
      y: camera.y - overscanWorld,
      w: worldW + overscanWorld * 2,
      h: worldH + overscanWorld * 2,
    };
  }, [camera.x, camera.y, camera.zoom, overscanPx, viewport.h, viewport.w]);

  const [visibleNodes, setVisibleNodes] = useState<NodeData[]>([]);
  const visibleNodesRef = useRef<NodeData[]>([]);
  useEffect(() => {
    visibleNodesRef.current = visibleNodes;
  }, [visibleNodes]);

  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const candidates = querySpatialIndex(index, viewWorldRect);
      const filtered = candidates.filter((n) =>
        rectIntersects(viewWorldRect, { x: n.x, y: n.y, w: n.width, h: n.height })
      );
      // 保证 DOM 顺序稳定：
      // 1) 先按 z 排序（层级）
      // 2) 再按 id 兜底
      filtered.sort((a, b) => {
        const za = a.z ?? 0;
        const zb = b.z ?? 0;
        if (za !== zb) return za - zb;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
      setVisibleNodes(filtered);
    });
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [index, viewWorldRect]);

  return { visibleNodes, visibleNodesRef, viewWorldRect };
}
