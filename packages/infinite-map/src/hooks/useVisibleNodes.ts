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
  /**
   * 冻结可见节点列表（用于 pan 过程中避免节点频繁卸载/重建导致闪烁）
   */
  freeze?: boolean;
  /**
   * 用于“重置虚拟化”的 key：
   * - 当 key 变化时，会同步（不经 rAF）立即重算一次可见节点
   * - 用于处理 resize 后下一次交互前，visibleNodes 仍处于旧快照导致的闪烁
   */
  resetKey?: number;
};

/**
 * 可见节点虚拟化（空间索引 + 视口裁剪）
 * - 使用空间索引减少候选数量
 * - 使用 rAF 合并计算，拖动/缩放时更稳
 * - 对结果排序保证 DOM 顺序稳定
 */
export function useVisibleNodes({ nodes, cellSize, camera, viewport, overscanPx, enabled = true, keepAlive, freeze = false, resetKey }: Params) {
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
  const computeVisibleNow = (index0: ReturnType<typeof buildSpatialIndex> | null, rect: Rect) => {
    const candidates = enabled && index0 ? querySpatialIndex(index0, rect) : renderNodes;
    const filtered = candidates.filter((n) => rectIntersects(rect, { x: n.x, y: n.y, w: n.width, h: n.height }));

    // keepAlive：额外合并“不被卸载”的节点（例如图表/视频/富文本节点）
    if (enabled && keepAliveNodes.length) {
      const byId = new Map<string, NodeData>();
      for (const n of filtered) byId.set(n.id, n);
      for (const n of keepAliveNodes) if (!byId.has(n.id)) filtered.push(n);
    }

    filtered.sort((a, b) => {
      const za = a.z ?? 0;
      const zb = b.z ?? 0;
      if (za !== zb) return za - zb;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return filtered;
  };

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
    // freeze：保持当前 visibleNodes 不变，避免 pan 时卸载/重建闪烁
    if (freeze) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setVisibleNodes(computeVisibleNow(index, viewWorldRect));
    });
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, freeze, index, keepAliveNodes, renderNodes, viewWorldRect]);

  // resetKey：同步重算一次（不经 rAF）
  useEffect(() => {
    if (!enabled) return;
    setVisibleNodes(computeVisibleNow(index, viewWorldRect));
  }, [enabled, index, viewWorldRect, resetKey]);

  return { visibleNodes, visibleNodesRef, viewWorldRect };
}
