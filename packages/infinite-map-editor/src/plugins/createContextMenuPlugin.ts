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
        //
        // 但当当前已经是“多选”时（prevSelection.length > 1），很多用户期望：
        // - 右键任意一个节点也应保持当前多选集合不变（便于对齐/分布/批量操作）
        // 特别是在 group 场景下，contextmenu hitTest 会把组内节点规范化为最外层 group，
        // 如果直接切换 selection，会导致分布命令永远灰掉（selectionIds 被收缩成 1 个）。
        if (hitNodeId) {
          if (!prevSelection.includes(hitNodeId)) {
            if (prevSelection.length <= 1) {
              sel?.setIds?.([hitNodeId]);
              selectionIds = [hitNodeId];
            } else {
              // 多选时不收缩 selection
              selectionIds = prevSelection;
            }
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
