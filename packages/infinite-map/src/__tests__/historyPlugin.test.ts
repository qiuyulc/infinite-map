import { describe, expect, it } from 'vitest';
import type { Camera, NodeData } from '../core/types';
import { applyPatchesToNodes, createEventBus, createStore } from '../editor/runtime';
import type { ChangeMeta, MapContext, NodePatch } from '../editor/types';
import { STORE_KEYS } from '../editor/keys';
import { createHistoryPlugin } from '../editor/plugins/core/createHistoryPlugin';

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
      // mimic InfiniteMap.applyPatches: emit patches:applied with before snapshot, then update nodes
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

  return {
    ctx,
    bus,
    store,
    getNodes: () => nodes,
  };
}

describe('createHistoryPlugin', () => {
  it('merges move-phase patches and undo/redo works', () => {
    const { ctx, bus, store, getNodes } = makeCtx([{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]);

    const history = createHistoryPlugin({ limit: 10 });
    history.setup?.(ctx);

    const move1: NodePatch[] = [{ type: 'move', id: 'a', x: 10, y: 0 }];
    const move2: NodePatch[] = [{ type: 'move', id: 'a', x: 20, y: 0 }];
    const end: NodePatch[] = [{ type: 'move', id: 'a', x: 30, y: 0 }];

    ctx.applyPatches(move1, { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'move', ids: ['a'] });
    ctx.applyPatches(move2, { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'move', ids: ['a'] });
    ctx.applyPatches(end, { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'end', ids: ['a'] });

    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(30);

    const undoStack = store.get<any[]>(STORE_KEYS.historyUndoStack) ?? [];
    const redoStack = store.get<any[]>(STORE_KEYS.historyRedoStack) ?? [];
    expect(undoStack.length).toBe(1);
    expect(redoStack.length).toBe(0);

    // undo
    bus.emit('history:undo', { source: 'api' });
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(0);

    // redo
    bus.emit('history:redo', { source: 'api' });
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(30);
  });

  it('undo/redo supports add/remove', () => {
    const { ctx, bus, getNodes } = makeCtx([]);
    const history = createHistoryPlugin({ limit: 10 });
    history.setup?.(ctx);

    ctx.applyPatches(
      [{ type: 'add', node: { id: 'n1', x: 0, y: 0, width: 1, height: 1 } }],
      { source: 'plugin', plugin: 'clipboard', reason: 'paste', phase: 'end', ids: ['n1'] }
    );
    expect(getNodes().map((n) => n.id)).toEqual(['n1']);

    bus.emit('history:undo', { source: 'api' });
    expect(getNodes().map((n) => n.id)).toEqual([]);

    bus.emit('history:redo', { source: 'api' });
    expect(getNodes().map((n) => n.id)).toEqual(['n1']);
  });
});

