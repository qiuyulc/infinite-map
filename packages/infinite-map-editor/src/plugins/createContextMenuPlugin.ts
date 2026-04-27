import { STORE_KEYS, type HitTestTarget, type InfiniteMapPlugin, type MapContext, type MapContextMenuEvent } from '@qiuyulc/infinite-map';

export type ContextMenuPayload = {
  screen: { x: number; y: number };
  world: { x: number; y: number };
  selectionIds: string[];
  hitNodeId: string | null;
};

export type ContextMenuPluginOptions = {
  onOpen?: (payload: ContextMenuPayload, ctx: MapContext) => void;
};

export function createContextMenuPlugin(opts: ContextMenuPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'contextmenu',
    provides: ['contextmenu'],
    requires: ['selection'],
    input: {
      onContextMenu: (e: MapContextMenuEvent, ctx: MapContext, hit: HitTestTarget) => {
        if (ctx.store.get<boolean>(STORE_KEYS.editEnabled) === false) return { handled: false };
        const sel = ctx.getService<{ getIds: () => string[]; setIds?: (ids: string[]) => void }>('selection');
        const prevSelection = sel?.getIds?.() ?? [];

        // 注意：hit.id 已由 hitTest 阶段统一（contextmenu 场景会把组内节点规范化为最外层 group）
        let hitNodeId: string | null = hit.kind === 'node' ? hit.id : hit.kind === 'handle' ? hit.id : null;
        let selectionIds = prevSelection;

        // 右键命中节点：如果该节点不在 selection 中，则先把 selection 切到该节点（常见编辑器语义）
        if (hitNodeId) {
          if (!prevSelection.includes(hitNodeId)) {
            sel?.setIds?.([hitNodeId]);
            selectionIds = [hitNodeId];
          }
        }

        const payload: ContextMenuPayload = {
          screen: e.screen,
          world: e.world,
          selectionIds,
          hitNodeId,
        };
        ctx.store.set(STORE_KEYS.contextMenuState, payload);
        opts.onOpen?.(payload, ctx);
        return { handled: true };
      },
    },
  };
}
