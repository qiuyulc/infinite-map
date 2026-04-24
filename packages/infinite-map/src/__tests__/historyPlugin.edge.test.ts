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
    queryNodesInWorldRect: () => nodes,
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    bus,
    store,
    services: {},
    registerService: () => void 0,
    getService: () => undefined,
    requestRender: () => void 0,
    applyPatches: (patches: NodePatch[], meta: ChangeMeta) => {
      // mimic InfiniteMap: emit patches:applied with before snapshot
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

  return { ctx, store, bus, getNodes: () => nodes };
}

describe('history edge cases', () => {
  it('redo stack should be cleared when new change happens after undo', () => {
    const { ctx, store, bus, getNodes } = makeCtx([{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]);
    const history = createHistoryPlugin({ limit: 10 });
    history.setup?.(ctx);

    // change 1
    ctx.applyPatches([{ type: 'move', id: 'a', x: 10, y: 0 }], { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'end', ids: ['a'] });
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(10);

    // undo => redo has 1
    bus.emit('history:undo', { source: 'api' });
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(0);
    expect((store.get<any[]>(STORE_KEYS.historyRedoStack) ?? []).length).toBe(1);

    // new change => redo cleared
    ctx.applyPatches([{ type: 'move', id: 'a', x: 7, y: 0 }], { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'end', ids: ['a'] });
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(7);
    expect((store.get<any[]>(STORE_KEYS.historyRedoStack) ?? []).length).toBe(0);
  });

  it('limit should cap undo stack size', () => {
    const { ctx, store } = makeCtx([{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]);
    const history = createHistoryPlugin({ limit: 3 });
    history.setup?.(ctx);

    for (let i = 1; i <= 6; i++) {
      ctx.applyPatches([{ type: 'move', id: 'a', x: i, y: 0 }], { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'end', ids: ['a'] });
    }
    const undo = store.get<any[]>(STORE_KEYS.historyUndoStack) ?? [];
    expect(undo.length).toBe(3);
  });
});

