import { STORE_KEYS, type InfiniteMapPlugin, type MapContext, type MapContextMenuEvent, type NodeData } from '@qiuyulc/infinite-map';

export type ContextMenuPayload = {
  screen: { x: number; y: number };
  world: { x: number; y: number };
  selectionIds: string[];
  hitNodeId: string | null;
};

export type ContextMenuPluginOptions = {
  onOpen?: (payload: ContextMenuPayload, ctx: MapContext) => void;
};

function hitTestTop(nodes: NodeData[], p: { x: number; y: number }): NodeData | null {
  // nodes 已经按 z 升序排序，后面的视为更上层
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height) return n;
  }
  return null;
}

export function createContextMenuPlugin(opts: ContextMenuPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'contextmenu',
    provides: ['contextmenu'],
    requires: ['selection'],
    handlers: {
      onContextMenu: (e: MapContextMenuEvent, ctx: MapContext) => {
        const selectionIds = ctx.getService<{ getIds: () => string[] }>('selection')?.getIds() ?? [];
        const hit = hitTestTop(ctx.getVisibleNodes(), e.world);
        const payload: ContextMenuPayload = {
          screen: e.screen,
          world: e.world,
          selectionIds,
          hitNodeId: hit?.id ?? null,
        };
        ctx.store.set(STORE_KEYS.contextMenuState, payload);
        opts.onOpen?.(payload, ctx);
        return { handled: true };
      },
    },
  };
}
