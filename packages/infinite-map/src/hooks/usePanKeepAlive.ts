import { useCallback, useEffect, useRef, useState } from 'react';
import type { MapContext } from '../editor/types';
import { STORE_KEYS } from '../editor/keys';
import type { EngineStore } from '../engine';
import type { NodeData } from '../core/types';

type Params = {
  ctx: MapContext;
  engineStore: EngineStore;
  virtualization?: {
    enabled?: boolean;
    overscanPx?: number;
    keepAlive?: (node: NodeData) => boolean;
    panKeepAlive?: boolean | { maxNodes?: number };
  };
};

export function usePanKeepAlive({ ctx, engineStore, virtualization }: Params) {
  const [panActive, setPanActive] = useState(false);
  const panKeepAliveEnabled = (virtualization?.panKeepAlive ?? true) !== false;
  const panKeepAliveMaxNodes = typeof virtualization?.panKeepAlive === 'object'
    ? virtualization.panKeepAlive.maxNodes ?? 2000
    : 2000;
  const panKeepAliveIdSetRef = useRef<Set<string>>(new Set());
  const panKeepAliveLRURef = useRef<Map<string, number>>(new Map());

  const panKeepAliveAdd = useCallback(
    (ids: Iterable<string>) => {
      const set0 = panKeepAliveIdSetRef.current;
      const lru = panKeepAliveLRURef.current;
      for (const id of ids) {
        set0.add(id);
        if (lru.has(id)) lru.delete(id);
        lru.set(id, Date.now());
      }
      while (lru.size > panKeepAliveMaxNodes) {
        const first = lru.keys().next().value as string | undefined;
        if (!first) break;
        lru.delete(first);
        set0.delete(first);
      }
    },
    [panKeepAliveMaxNodes]
  );

  useEffect(() => {
    ctx.store.set(STORE_KEYS.viewPanActive, panActive);
    engineStore.getState().setInteraction({ panning: panActive });
  }, [ctx, engineStore, panActive]);

  return {
    panActive,
    setPanActive,
    panKeepAliveEnabled,
    panKeepAliveIdSetRef,
    panKeepAliveLRURef,
    panKeepAliveAdd,
  };
}
