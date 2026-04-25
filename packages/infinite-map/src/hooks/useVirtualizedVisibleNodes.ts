import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Camera, NodeData } from '../core/types';
import { rectIntersects } from '../core/types';
import { STORE_KEYS } from '../editor/keys';
import { useVisibleNodes } from './useVisibleNodes';

export function useVirtualizedVisibleNodes({
  nodes,
  cellSize,
  camera,
  viewport,
  overscanPx,
  virtualization,
  store,
  debugRef,
  visibleNodesRef,
}: {
  nodes: NodeData[];
  cellSize: number;
  camera: Camera;
  viewport: { w: number; h: number };
  overscanPx: number;
  virtualization?: {
    enabled?: boolean;
    overscanPx?: number;
    keepAlive?: (node: NodeData) => boolean;
    panKeepAlive?: boolean | { maxNodes?: number };
  };
  store: { set: (key: string, v: any) => void };
  debugRef: React.MutableRefObject<boolean>;
  visibleNodesRef: React.MutableRefObject<NodeData[]>;
}) {
  const enabled = virtualization?.enabled ?? true;
  const virtualizationOverscanPx = virtualization?.overscanPx ?? overscanPx;
  const keepAlive = virtualization?.keepAlive;

  // panning 时防止“可见节点进出边界导致卸载/重建”造成闪烁：
  // - pan 期间：允许“新进入视口的节点”正常 mount
  // - 但“离开视口的节点”在 pan 结束前不卸载（保持稳定）
  const [panActive, setPanActive] = useState(false);
  const panKeepAliveEnabled = (virtualization?.panKeepAlive ?? true) !== false;
  const panKeepAliveMaxNodes = typeof virtualization?.panKeepAlive === 'object' ? virtualization.panKeepAlive.maxNodes ?? 2000 : 2000;
  // 用稳定引用的 Set/Map 存储（避免把 Set 换引用导致 hooks 依赖混乱）
  const panKeepAliveIdSetRef = useRef<Set<string>>(new Set());
  const panKeepAliveLRURef = useRef<Map<string, number>>(new Map());

  const panKeepAliveAdd = useCallback(
    (ids: Iterable<string>) => {
      const set = panKeepAliveIdSetRef.current;
      const lru = panKeepAliveLRURef.current;
      for (const id of ids) {
        set.add(id);
        // LRU：通过 delete+set 把该 key 移到末尾
        if (lru.has(id)) lru.delete(id);
        lru.set(id, Date.now());
      }
      // 超限：移除最旧的
      while (lru.size > panKeepAliveMaxNodes) {
        const first = lru.keys().next().value as string | undefined;
        if (!first) break;
        lru.delete(first);
        set.delete(first);
      }
    },
    [panKeepAliveMaxNodes]
  );

  const { visibleNodes } = useVisibleNodes({
    nodes,
    cellSize,
    camera,
    viewport,
    overscanPx: virtualizationOverscanPx,
    enabled,
    keepAlive,
    keepAliveIdSet: panActive && panKeepAliveEnabled ? panKeepAliveIdSetRef.current : undefined,
  });

  // pan 期间：不断把“当前可见节点”加入 keepAlive 集合（允许 new nodes mount，old nodes 暂不卸载）
  useEffect(() => {
    if (!panActive || !panKeepAliveEnabled) return;
    panKeepAliveAdd(visibleNodes.map((n) => n.id));
  }, [panActive, panKeepAliveAdd, panKeepAliveEnabled, visibleNodes]);

  useEffect(() => {
    visibleNodesRef.current = visibleNodes;
  }, [visibleNodes, visibleNodesRef]);

  // debug：暴露可见节点数量（便于宿主排查虚拟化策略）
  useEffect(() => {
    if (!debugRef.current) return;
    store.set('debug:visibleNodesCount', visibleNodes.length);
  }, [store, visibleNodes, debugRef]);

  // 严格 “in view”：不包含 overscan，用于 UI 展示当前屏幕内真正可见的节点数量
  const inViewCount = useMemo(() => {
    if (visibleNodes.length === 0) return 0;
    if (viewport.w <= 0 || viewport.h <= 0) return 0;
    const z = camera.zoom || 1;
    const viewWorldRect = { x: camera.x, y: camera.y, w: viewport.w / z, h: viewport.h / z };
    let count = 0;
    for (const n of visibleNodes) if (rectIntersects(viewWorldRect, { x: n.x, y: n.y, w: n.width, h: n.height })) count++;
    return count;
  }, [camera.x, camera.y, camera.zoom, visibleNodes, viewport.h, viewport.w]);

  // 给插件提供严格 inViewCount（用于“可视区域内只有 1 个节点”的判断）
  useEffect(() => {
    store.set(STORE_KEYS.minimapInViewCount, inViewCount);
  }, [inViewCount, store]);

  return {
    visibleNodes,
    inViewCount,
    pan: {
      panActive,
      setPanActive,
      panKeepAliveEnabled,
      panKeepAliveAdd,
      panKeepAliveIdSetRef,
      panKeepAliveLRURef,
    },
  };
}
