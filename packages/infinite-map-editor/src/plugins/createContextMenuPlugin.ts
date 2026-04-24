import { STORE_KEYS, type InfiniteMapPlugin, type MapContext, type MapContextMenuEvent, type NodeData } from '@qiuyulc/infinite-map';
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
        const sel = ctx.getService<{ getIds: () => string[]; setIds?: (ids: string[]) => void }>('selection');
        const prevSelection = sel?.getIds?.() ?? [];
        const hit = hitTestTop(ctx.getVisibleNodes(), e.world);

        let hitNodeId: string | null = hit?.id ?? null;
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
