import { describe, expect, it } from 'vitest';
import {
  createEventBus,
  createStore,
  STORE_KEYS,
  type Camera,
  type HitTestTarget,
  type MapContext,
  type MapPointerEvent,
  type NodeData,
} from '@qiuyulc/infinite-map';
import { createSelectionPlugin } from '../plugins/createSelectionPlugin';

function makeCtx(nodes: NodeData[]) {
  const bus = createEventBus();
  const store = createStore();

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
    applyPatches: () => void 0,
  } as MapContext;

  return { ctx, store, bus };
}

function pe(partial: Partial<MapPointerEvent> & { world: { x: number; y: number } }): MapPointerEvent {
  const { world, ...rest } = partial;
  return {
    type: 'down',
    pointerId: 1,
    button: 0,
    buttons: 1,
    screen: { x: world.x, y: world.y },
    world,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    originalEvent: { target: null },
    ...rest,
  };
}

describe('createSelectionPlugin', () => {
  function runDown(plugin: ReturnType<typeof createSelectionPlugin>, e: MapPointerEvent, ctx: MapContext, hit?: HitTestTarget) {
    const ht =
      hit ??
      plugin.hitTests?.[0]?.hitTest(e, ctx, { kind: 'pointer' }) ??
      ({ kind: 'blank' } as HitTestTarget);
    return plugin.pointerDownProcessors?.[0]?.onPointerDown(e, ctx, ht);
  }

  it('click node selects it (single select)', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ]);
    const plugin = createSelectionPlugin();

    const res = runDown(plugin, pe({ world: { x: 10, y: 10 } }), ctx);
    expect(res).toBeUndefined();
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('shift-click toggles selection', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ]);
    const plugin = createSelectionPlugin();

    store.set(STORE_KEYS.selectionIds, ['a']);
    runDown(plugin, pe({ world: { x: 210, y: 10 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }), ctx);
    expect(new Set(store.get<string[]>(STORE_KEYS.selectionIds))).toEqual(new Set(['a', 'b']));

    runDown(plugin, pe({ world: { x: 10, y: 10 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['b']);
  });

  it('blank click clears selection (when clearOnBlankClick=true) but shift keeps', () => {
    const { ctx, store } = makeCtx([{ id: 'a', x: 0, y: 0, width: 100, height: 80 }]);
    const plugin = createSelectionPlugin({ clearOnBlankClick: true });
    store.set(STORE_KEYS.selectionIds, ['a']);

    // blank click => clear
    runDown(plugin, pe({ world: { x: 500, y: 500 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual([]);

    // shift blank click => keep
    store.set(STORE_KEYS.selectionIds, ['a']);
    runDown(plugin, pe({ world: { x: 500, y: 500 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('locked nodes are selectable (but stop), hidden nodes behave as blank', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80, locked: true },
      { id: 'b', x: 200, y: 0, width: 100, height: 80, hidden: true },
      { id: 'c', x: 400, y: 0, width: 100, height: 80 },
    ]);
    const plugin = createSelectionPlugin();
    store.set(STORE_KEYS.selectionIds, ['c']);

    const res1 = runDown(plugin, pe({ world: { x: 10, y: 10 } }), ctx);
    expect(res1).toEqual({ stop: true, hit: { kind: 'node', id: 'a', cursor: 'grab' } });
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);

    const res2 = runDown(plugin, pe({ world: { x: 210, y: 10 } }), ctx);
    expect(res2).toBeUndefined();
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual([]);
  });

  it('click on resize handle does not clear selection (continue propagation)', () => {
    const { ctx, store } = makeCtx([{ id: 'a', x: 0, y: 0, width: 100, height: 80 }]);
    const plugin = createSelectionPlugin({ clearOnBlankClick: true });
    store.set(STORE_KEYS.selectionIds, ['a']);

    runDown(plugin, pe({ world: { x: 500, y: 500 } }), ctx, { kind: 'handle', owner: 'resize', id: 'a', handle: 'se' });
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('click child of group selects outermost group', () => {
    const { ctx, store } = makeCtx([
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
    ]);
    const plugin = createSelectionPlugin();

    runDown(plugin, pe({ world: { x: 15, y: 15 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['g']);
  });

  it('click nested child promotes to outermost group', () => {
    const { ctx, store } = makeCtx([
      { id: 'g1', kind: 'group', x: 0, y: 0, width: 200, height: 200 },
      { id: 'g2', kind: 'group', parentId: 'g1', x: 10, y: 10, width: 100, height: 100 },
      { id: 'a', parentId: 'g2', x: 20, y: 20, width: 10, height: 10 },
    ]);
    const plugin = createSelectionPlugin();

    runDown(plugin, pe({ world: { x: 25, y: 25 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['g1']);
  });

  it('double-click penetrates and selects child node directly', () => {
    const { ctx, store } = makeCtx([
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
    ]);
    const plugin = createSelectionPlugin({ dblClickMs: 10 });

    runDown(plugin, pe({ world: { x: 15, y: 15 } }), ctx);
    runDown(plugin, pe({ world: { x: 15, y: 15 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('double-click on group frame selects group itself', () => {
    const { ctx, store } = makeCtx([
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
    ]);
    const plugin = createSelectionPlugin({ dblClickMs: 10 });

    runDown(plugin, pe({ world: { x: 90, y: 90 } }), ctx);
    runDown(plugin, pe({ world: { x: 90, y: 90 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['g']);
  });

  it('re-clicking an already-selected child does not promote it', () => {
    const { ctx, store } = makeCtx([
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
    ]);
    const plugin = createSelectionPlugin({ dblClickMs: 10 });

    runDown(plugin, pe({ world: { x: 15, y: 15 } }), ctx);
    runDown(plugin, pe({ world: { x: 15, y: 15 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);

    runDown(plugin, pe({ world: { x: 15, y: 15 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('shift-click child promotes to group and toggles', () => {
    const { ctx, store } = makeCtx([
      { id: 'g1', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g1', x: 10, y: 10, width: 10, height: 10 },
      { id: 'g2', kind: 'group', x: 200, y: 0, width: 100, height: 100 },
      { id: 'b', parentId: 'g2', x: 210, y: 10, width: 10, height: 10 },
    ]);
    const plugin = createSelectionPlugin();

    store.set(STORE_KEYS.selectionIds, ['g1']);
    runDown(
      plugin,
      pe({ world: { x: 215, y: 15 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }),
      ctx
    );
    expect(new Set(store.get<string[]>(STORE_KEYS.selectionIds))).toEqual(new Set(['g1', 'g2']));
  });

  it('shift-double-click penetrates and toggles child node', () => {
    const { ctx, store } = makeCtx([
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ]);
    const plugin = createSelectionPlugin({ dblClickMs: 10 });

    store.set(STORE_KEYS.selectionIds, ['b']);
    runDown(
      plugin,
      pe({ world: { x: 15, y: 15 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }),
      ctx
    );
    runDown(
      plugin,
      pe({ world: { x: 15, y: 15 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }),
      ctx
    );
    // first shift-click promotes to group g and toggles it → ['b', 'g']
    // second shift-click triggers double-click, penetrates and selects 'a' → ['a']
    expect(new Set(store.get<string[]>(STORE_KEYS.selectionIds))).toEqual(new Set(['a']));
  });
});
