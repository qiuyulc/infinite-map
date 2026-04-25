import { describe, expect, it } from 'vitest';
import { createEventBus, createStore, STORE_KEYS, type Camera, type HitTestTarget, type MapContext, type MapContextMenuEvent, type NodeData } from '@qiuyulc/infinite-map';
import { createContextMenuPlugin } from '../plugins/createContextMenuPlugin';
import { createSelectionPlugin } from '../plugins/createSelectionPlugin';

function makeCtx(nodes: NodeData[]) {
  const bus = createEventBus();
  const store = createStore();
  const services: Record<string, any> = {};

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
    registerService: (id: string, svc: unknown) => {
      services[id] = svc;
    },
    getService: (id: string) => services[id],
    requestRender: () => void 0,
    applyPatches: () => void 0,
  } as MapContext;

  return { ctx, store };
}

function ce(world: { x: number; y: number }): MapContextMenuEvent {
  return {
    screen: { x: world.x, y: world.y },
    world,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    originalEvent: {},
  };
}

describe('createContextMenuPlugin', () => {
  it('right click on node selects it when not selected', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ]);
    const selection = createSelectionPlugin();
    selection.setup?.(ctx);
    store.set(STORE_KEYS.selectionIds, ['b']);

    const menu = createContextMenuPlugin();
    menu.input!.onContextMenu!(ce({ x: 10, y: 10 }), ctx, { kind: 'node', id: 'a' } satisfies HitTestTarget);

    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
    const st = store.get<any>(STORE_KEYS.contextMenuState);
    expect(st.selectionIds).toEqual(['a']);
    expect(st.hitNodeId).toBe('a');
  });

  it('right click on already selected node keeps selection (multi)', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ]);
    const selection = createSelectionPlugin();
    selection.setup?.(ctx);
    store.set(STORE_KEYS.selectionIds, ['a', 'b']);

    const menu = createContextMenuPlugin();
    menu.input!.onContextMenu!(ce({ x: 10, y: 10 }), ctx, { kind: 'node', id: 'a' } satisfies HitTestTarget);

    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a', 'b']);
    const st = store.get<any>(STORE_KEYS.contextMenuState);
    expect(st.selectionIds).toEqual(['a', 'b']);
    expect(st.hitNodeId).toBe('a');
  });

  it('right click on node inside nested groups selects outermost group', () => {
    const { ctx, store } = makeCtx([
      { id: 'g1', kind: 'group', x: 0, y: 0, width: 500, height: 500 },
      { id: 'g2', kind: 'group', parentId: 'g1', x: 0, y: 0, width: 300, height: 300 },
      { id: 'n', parentId: 'g2', x: 10, y: 10, width: 50, height: 50 },
    ]);
    const selection = createSelectionPlugin();
    selection.setup?.(ctx);
    store.set(STORE_KEYS.selectionIds, []);

    const menu = createContextMenuPlugin();
    menu.input!.onContextMenu!(ce({ x: 20, y: 20 }), ctx, { kind: 'node', id: 'n' } satisfies HitTestTarget);

    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['g1']);
    const st = store.get<any>(STORE_KEYS.contextMenuState);
    expect(st.selectionIds).toEqual(['g1']);
    expect(st.hitNodeId).toBe('g1');
  });
});
