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

function makeCtx(initialNodes: NodeData[]) {
  const bus = createEventBus();
  const store = createStore();
  let nodes = initialNodes;

  const ctx: MapContext = {
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
    getViewport: () => ({ w: 1000, h: 800 }),
    getNodes: () => nodes,
    getVisibleNodes: () => nodes,
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    queryNodesInWorldRect: () => nodes,
    bus,
    store,
    services: {},
    registerService: () => void 0,
    getService: () => undefined,
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

describe('createHistoryPlugin boundaries', () => {
  it('flushes pending when move key changes (plugin/reason)', () => {
    const { ctx, store, getNodes } = makeCtx([{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]);
    const history = createHistoryPlugin({ limit: 10 });
    history.setup?.(ctx);

    // 1) drag move start (pending, not flushed)
    ctx.applyPatches([{ type: 'move', id: 'a', x: 10, y: 0 }], { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'move', ids: ['a'] });
    expect(store.get<any[]>(STORE_KEYS.historyUndoStack)?.length ?? 0).toBe(0);

    // 2) another action starts with a different key => should flush previous pending
    ctx.applyPatches([{ type: 'move', id: 'a', x: 20, y: 0 }], {
      source: 'plugin',
      plugin: 'resize',
      reason: 'drag',
      phase: 'move',
      ids: ['a'],
    });
    expect(store.get<any[]>(STORE_KEYS.historyUndoStack)?.length ?? 0).toBe(1);

    // 3) resize ends => second entry flushed
    ctx.applyPatches([{ type: 'move', id: 'a', x: 30, y: 0 }], {
      source: 'plugin',
      plugin: 'resize',
      reason: 'drag',
      phase: 'end',
      ids: ['a'],
    });
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(30);
    expect(store.get<any[]>(STORE_KEYS.historyUndoStack)?.length ?? 0).toBe(2);
  });
});

