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
  enabled?: boolean;
  keepAlive?: (node: NodeData) => boolean;
};

/**
 * 可见节点虚拟化（空间索引 + 视口裁剪）
 * - 使用空间索引减少候选数量
 * - 使用 rAF 合并计算，拖动/缩放时更稳
 * - 对结果排序保证 DOM 顺序稳定
 */
export function useVisibleNodes({ nodes, cellSize, camera, viewport, overscanPx, enabled = true, keepAlive }: Params) {
  // hidden 需要“向下传递”：只要任意祖先是 hidden，则该节点也应视为隐藏
  const renderNodes = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    const memo = new Map<string, boolean>();
    const isHidden = (id: string): boolean => {
      const cached = memo.get(id);
      if (cached != null) return cached;
      const n = byId.get(id);
      if (!n) return false;
      if (n.hidden) {
        memo.set(id, true);
        return true;
      }
      if (n.parentId) {
        const v = isHidden(n.parentId);
        memo.set(id, v);
        return v;
      }
      memo.set(id, false);
      return false;
    };
    return nodes.filter((n) => !isHidden(n.id));
  }, [nodes]);
  const index = useMemo(() => (enabled ? buildSpatialIndex(renderNodes, cellSize) : null), [enabled, renderNodes, cellSize]);

  const keepAliveNodes = useMemo(() => {
    if (!enabled) return [];
    if (!keepAlive) return [];
    return nodes.filter(keepAlive);
  }, [enabled, keepAlive, nodes]);

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
    if (!enabled) {
      // 关闭虚拟化：渲染全部节点（仍保持稳定排序）
      const all = [...renderNodes];
      all.sort((a, b) => {
        const za = a.z ?? 0;
        const zb = b.z ?? 0;
        if (za !== zb) return za - zb;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
      setVisibleNodes(all);
      return;
    }
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const candidates = querySpatialIndex(index!, viewWorldRect);
      const filtered = candidates.filter((n) => rectIntersects(viewWorldRect, { x: n.x, y: n.y, w: n.width, h: n.height }));

      // keepAlive：额外合并“不被卸载”的节点（例如图表/视频/富文本节点）
      if (keepAliveNodes.length) {
        const byId = new Map<string, NodeData>();
        for (const n of filtered) byId.set(n.id, n);
        for (const n of keepAliveNodes) if (!byId.has(n.id)) filtered.push(n);
      }

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
  }, [enabled, index, keepAliveNodes, renderNodes, viewWorldRect]);

  return { visibleNodes, visibleNodesRef, viewWorldRect };
}
