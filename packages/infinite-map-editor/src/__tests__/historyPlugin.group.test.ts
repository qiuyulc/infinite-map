import { describe, expect, it } from 'vitest';
import {
  applyPatchesToNodes,
  createEventBus,
  createStore,
  STORE_KEYS,
  type Camera,
  type ChangeMeta,
  type MapContext,
  type NodeData,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import { createHistoryPlugin } from '../plugins/createHistoryPlugin';
import { createGroupPlugin } from '../plugins/createGroupPlugin';

function makeCtx(initialNodes: NodeData[]) {
  const bus = createEventBus();
  const store = createStore();
  let nodes = initialNodes;
  const services: Record<string, unknown> = {};

  const ctx: MapContext = {
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
    getViewport: () => ({ w: 1000, h: 800 }),
    getNodes: () => nodes,
    getVisibleNodes: () => nodes,
    queryNodesInWorldRect: () => nodes,
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    bus,
    store,
    services,
    registerService: (name, service) => {
      services[name] = service;
    },
    getService: (name) => services[name],
    requestRender: () => void 0,
    applyPatches: (patches: NodePatch[], meta: ChangeMeta) => {
      const beforeById: Record<string, NodeData | undefined> = {};
      const byId = new Map(nodes.map((n) => [n.id, n] as const));
      for (const p of patches) {
        const id = p.type === 'add' ? p.node.id : p.id;
        if (!(id in beforeById)) beforeById[id] = byId.get(id);
      }
      bus.emit('patches:applied', { patches, meta, beforeById });
      nodes = applyPatchesToNodes(nodes, patches);
    },
  } as MapContext;

  return { ctx, bus, store, getNodes: () => nodes };
}

describe('history + group/ungroup', () => {
  it('undo/redo works for group command', () => {
    const { ctx, bus, store, getNodes } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 10, height: 10 },
      { id: 'b', x: 30, y: 0, width: 10, height: 10 },
    ]);

    // selection service
    let selIds = ['a', 'b'];
    ctx.registerService('selection', {
      getIds: () => selIds,
      setIds: (ids: string[]) => {
        selIds = ids;
        ctx.store.set(STORE_KEYS.selectionIds, ids);
      },
      clear: () => {
        selIds = [];
        ctx.store.set(STORE_KEYS.selectionIds, []);
      },
    });
    // document service
    ctx.registerService('document', { applyPatches: (patches: NodePatch[], meta: ChangeMeta) => ctx.applyPatches(patches, meta) });

    const history = createHistoryPlugin({ limit: 10 });
    history.setup?.(ctx);
    const group = createGroupPlugin();
    group.setup?.(ctx);

    // run group
    group.commands?.['edit.group']?.run(ctx, { source: 'api' });
    const groupId = getNodes().find((n) => n.kind === 'group')?.id;
    expect(groupId).toBeTruthy();
    expect(getNodes().filter((n) => n.parentId === groupId).map((n) => n.id).sort()).toEqual(['a', 'b']);
    expect(selIds).toEqual([groupId!]);

    // history has 1 entry
    expect((store.get<any[]>(STORE_KEYS.historyUndoStack) ?? []).length).toBe(1);

    // undo => group removed, parentId cleared
    bus.emit('history:undo', { source: 'api' });
    expect(getNodes().some((n) => n.kind === 'group')).toBe(false);
    expect(getNodes().find((n) => n.id === 'a')?.parentId).toBeUndefined();
    expect(getNodes().find((n) => n.id === 'b')?.parentId).toBeUndefined();

    // redo => group restored, parentId set
    bus.emit('history:redo', { source: 'api' });
    const groupId2 = getNodes().find((n) => n.kind === 'group')?.id;
    expect(groupId2).toBeTruthy();
    expect(getNodes().filter((n) => n.parentId === groupId2).map((n) => n.id).sort()).toEqual(['a', 'b']);
  });

  it('undo/redo works for ungroup command', () => {
    const { ctx, bus, getNodes } = makeCtx([
      { id: 'g', kind: 'group', x: -10, y: -10, width: 80, height: 40 },
      { id: 'a', parentId: 'g', x: 0, y: 0, width: 10, height: 10 },
      { id: 'b', parentId: 'g', x: 30, y: 0, width: 10, height: 10 },
    ]);

    let selIds = ['g'];
    ctx.registerService('selection', {
      getIds: () => selIds,
      setIds: (ids: string[]) => {
        selIds = ids;
      },
      clear: () => {
        selIds = [];
      },
    });
    ctx.registerService('document', { applyPatches: (patches: NodePatch[], meta: ChangeMeta) => ctx.applyPatches(patches, meta) });

    const history = createHistoryPlugin({ limit: 10 });
    history.setup?.(ctx);
    const group = createGroupPlugin();
    group.setup?.(ctx);

    // ungroup
    group.commands?.['edit.ungroup']?.run(ctx, { source: 'api' });
    expect(getNodes().some((n) => n.id === 'g')).toBe(false);
    expect(getNodes().find((n) => n.id === 'a')?.parentId).toBeUndefined();
    expect(getNodes().find((n) => n.id === 'b')?.parentId).toBeUndefined();
    expect(selIds.sort()).toEqual(['a', 'b']);

    // undo => group restored, children reparented
    bus.emit('history:undo', { source: 'api' });
    expect(getNodes().some((n) => n.id === 'g')).toBe(true);
    expect(getNodes().find((n) => n.id === 'a')?.parentId).toBe('g');
    expect(getNodes().find((n) => n.id === 'b')?.parentId).toBe('g');
  });
});
