import { STORE_KEYS } from '../../keys';
import type { ChangeMeta, Command, InfiniteMapPlugin, MapContext, NodePatch } from '../../types';
import type { NodeData } from '../../../core/types';
import { isHiddenEffective, isLockedEffective } from '../../groupUtils';
import type { ToolbarItem } from '../hud/createToolbarPlugin';
import type { ContextMenuItem } from '../hud/createDefaultContextMenuPlugin';
import type { ContextMenuPayload } from '../hud/createContextMenuPlugin';

function getSelectionService(ctx: MapContext) {
  return ctx.getService<{ getIds: () => string[]; setIds: (ids: string[]) => void; clear: () => void }>('selection');
}

function getDocumentService(ctx: MapContext) {
  return ctx.getService<{ applyPatches: (patches: NodePatch[], meta: ChangeMeta) => void }>('document');
}

function getHudService(ctx: MapContext) {
  return ctx.getService<{
    addToolbarItems: (items: ToolbarItem[]) => void;
    addContextMenuItems: (items: ContextMenuItem[]) => void;
  }>('hud');
}

function getContextMenuPayload(ctx: MapContext): ContextMenuPayload | null {
  return (ctx.store.get(STORE_KEYS.contextMenuState) as ContextMenuPayload | null) ?? null;
}

function getTargets(ctx: MapContext) {
  const sel = getSelectionService(ctx);
  const ids = sel?.getIds?.() ?? [];
  if (ids.length > 0) return ids;
  const payload = getContextMenuPayload(ctx);
  if (payload?.hitNodeId) return [payload.hitNodeId];
  return [];
}

function filterEditable(ctx: MapContext, ids: string[]) {
  const nodes = ctx.getNodes();
  return ids.filter((id) => !isHiddenEffective(nodes, id) && !isLockedEffective(nodes, id));
}

export function createLockHidePlugin(): InfiniteMapPlugin {
  const cmdLock: Command = {
    id: 'edit.lock',
    title: 'Lock',
    run: (ctx) => {
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const targets = getTargets(ctx);
      if (targets.length === 0) return;
      const nodes = ctx.getNodes();
      const ids = targets.filter((id) => !isHiddenEffective(nodes, id) && !isLockedEffective(nodes, id));
      if (ids.length === 0) return;
      doc.applyPatches(
        ids.map((id) => ({ type: 'set', id, data: { locked: true } as Partial<NodeData> })),
        { source: 'plugin', plugin: 'lockhide', reason: 'keyboard', phase: 'end', ids }
      );
      ctx.requestRender();
    },
  };

  const cmdUnlock: Command = {
    id: 'edit.unlock',
    title: 'Unlock',
    run: (ctx) => {
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const targets = getTargets(ctx);
      if (targets.length === 0) return;
      const nodes = ctx.getNodes();
      // 允许对“有效锁定”的节点解锁：只需要把该节点自身 locked=false（祖先锁定仍会生效）
      const ids = targets.filter((id) => !isHiddenEffective(nodes, id));
      if (ids.length === 0) return;
      doc.applyPatches(
        ids.map((id) => ({ type: 'set', id, data: { locked: false } as Partial<NodeData> })),
        { source: 'plugin', plugin: 'lockhide', reason: 'keyboard', phase: 'end', ids }
      );
      ctx.requestRender();
    },
  };

  const cmdHide: Command = {
    id: 'edit.hide',
    title: 'Hide',
    run: (ctx) => {
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const targets = getTargets(ctx);
      if (targets.length === 0) return;
      const nodes = ctx.getNodes();
      const ids = targets.filter((id) => !isHiddenEffective(nodes, id));
      if (ids.length === 0) return;
      doc.applyPatches(
        ids.map((id) => ({ type: 'set', id, data: { hidden: true } as Partial<NodeData> })),
        { source: 'plugin', plugin: 'lockhide', reason: 'keyboard', phase: 'end', ids }
      );
      // 隐藏后清空 selection（否则 selectionIds 里残留不可见节点 id）
      getSelectionService(ctx)?.clear?.();
      ctx.requestRender();
    },
  };

  const cmdShowAll: Command = {
    id: 'edit.showAll',
    title: 'Show All',
    run: (ctx) => {
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const nodes = ctx.getNodes();
      const ids = nodes.filter((n) => n.hidden).map((n) => n.id);
      if (ids.length === 0) return;
      doc.applyPatches(
        ids.map((id) => ({ type: 'set', id, data: { hidden: false } as Partial<NodeData> })),
        { source: 'plugin', plugin: 'lockhide', reason: 'keyboard', phase: 'end', ids }
      );
      ctx.requestRender();
    },
  };

  const enabledForToolbar = (ctx: MapContext) => filterEditable(ctx, getSelectionService(ctx)?.getIds?.() ?? []).length > 0;

  const enabledForUnlockToolbar = (ctx: MapContext) => {
    const ids = getSelectionService(ctx)?.getIds?.() ?? [];
    if (ids.length === 0) return false;
    const nodes = ctx.getNodes();
    return ids.some((id) => !isHiddenEffective(nodes, id));
  };

  const enabledForHideToolbar = (ctx: MapContext) => {
    const ids = getSelectionService(ctx)?.getIds?.() ?? [];
    if (ids.length === 0) return false;
    const nodes = ctx.getNodes();
    return ids.some((id) => !isHiddenEffective(nodes, id));
  };

  const enabledForMenu = (ctx: MapContext, s: ContextMenuPayload) => {
    const ids = s.selectionIds.length ? s.selectionIds : s.hitNodeId ? [s.hitNodeId] : [];
    return filterEditable(ctx, ids).length > 0;
  };

  const enabledForUnlockMenu = (ctx: MapContext, s: ContextMenuPayload) => {
    const nodes = ctx.getNodes();
    const ids = s.selectionIds.length ? s.selectionIds : s.hitNodeId ? [s.hitNodeId] : [];
    return ids.some((id) => !isHiddenEffective(nodes, id));
  };

  const enabledForHideMenu = (ctx: MapContext, s: ContextMenuPayload) => {
    const nodes = ctx.getNodes();
    const ids = s.selectionIds.length ? s.selectionIds : s.hitNodeId ? [s.hitNodeId] : [];
    return ids.some((id) => !isHiddenEffective(nodes, id));
  };

  const enabledForShowAll = (ctx: MapContext) => ctx.getNodes().some((n) => n.hidden);

  return {
    id: 'lockhide',
    provides: ['lockhide'],
    requires: ['commands', 'document', 'selection', 'hud'],
    commands: {
      [cmdLock.id]: cmdLock,
      [cmdUnlock.id]: cmdUnlock,
      [cmdHide.id]: cmdHide,
      [cmdShowAll.id]: cmdShowAll,
    },
    setup: (ctx) => {
      const hud = getHudService(ctx);
      hud?.addToolbarItems([
        { type: 'divider' },
        { type: 'command', id: 'edit.lock', label: 'Lock', title: '锁定', enabled: enabledForToolbar },
        { type: 'command', id: 'edit.unlock', label: 'Unlock', title: '解锁', enabled: enabledForUnlockToolbar },
        { type: 'command', id: 'edit.hide', label: 'Hide', title: '隐藏', enabled: enabledForHideToolbar },
        { type: 'command', id: 'edit.showAll', label: 'Show All', title: '显示全部', enabled: enabledForShowAll },
      ]);

      hud?.addContextMenuItems([
        { type: 'divider' },
        { type: 'command', id: 'edit.lock', label: '锁定', enabled: enabledForMenu },
        { type: 'command', id: 'edit.unlock', label: '解锁', enabled: enabledForUnlockMenu },
        { type: 'command', id: 'edit.hide', label: '隐藏', enabled: enabledForHideMenu },
        { type: 'command', id: 'edit.showAll', label: '显示全部', enabled: (_ctx, _s) => enabledForShowAll(ctx) },
      ]);
    },
  };
}

