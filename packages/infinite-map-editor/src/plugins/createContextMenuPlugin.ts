import { STORE_KEYS, type HitTestTarget, type InfiniteMapPlugin, type MapContext, type MapContextMenuEvent, type NodeData } from '@qiuyulc/infinite-map';
import { buildById, getAncestorChain, isGroupNode } from '../editor/groupUtils';

export type ContextMenuPayload = {
  screen: { x: number; y: number };
  world: { x: number; y: number };
  selectionIds: string[];
  hitNodeId: string | null;
};

export type ContextMenuPluginOptions = {
  onOpen?: (payload: ContextMenuPayload, ctx: MapContext) => void;
};

function pickOutermostGroupId(nodes: NodeData[], hitId: string): string {
  const byId = buildById(nodes);
  let out: string | null = null;
  const chain = [hitId, ...getAncestorChain(byId, hitId)];
  for (const id of chain) {
    const n = byId.get(id);
    if (n && isGroupNode(n)) out = id;
  }
  return out ?? hitId;
}

export function createContextMenuPlugin(opts: ContextMenuPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'contextmenu',
    provides: ['contextmenu'],
    requires: ['selection'],
    input: {
      onContextMenu: (e: MapContextMenuEvent, ctx: MapContext, hit: HitTestTarget) => {
        const sel = ctx.getService<{ getIds: () => string[]; setIds?: (ids: string[]) => void }>('selection');
        const prevSelection = sel?.getIds?.() ?? [];

        let hitNodeId: string | null = hit.kind === 'node' ? hit.id : hit.kind === 'handle' ? hit.id : null;
        let selectionIds = prevSelection;

        // 右键命中节点：如果该节点不在 selection 中，则先把 selection 切到该节点（常见编辑器语义）
        // - 若命中的是 group 或其子节点，则选中最外层 group（便于对整组操作）
        if (hitNodeId) {
          const effectiveId = pickOutermostGroupId(ctx.getNodes(), hitNodeId);
          hitNodeId = effectiveId;
          if (!prevSelection.includes(effectiveId)) {
            sel?.setIds?.([effectiveId]);
            selectionIds = [effectiveId];
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
