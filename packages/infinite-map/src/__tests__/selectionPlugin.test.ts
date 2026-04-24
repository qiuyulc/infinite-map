import { describe, expect, it } from 'vitest';
import type { Camera, NodeData } from '../core/types';
import { createEventBus, createStore } from '../editor/runtime';
import type { MapContext, MapPointerEvent } from '../editor/types';
import { STORE_KEYS } from '../editor/keys';
import { createSelectionPlugin } from '../editor/plugins/selection/createSelectionPlugin';

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
  return {
    type: 'down',
    pointerId: 1,
    button: 0,
    buttons: 1,
    screen: { x: partial.world.x, y: partial.world.y },
    world: partial.world,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    originalEvent: { target: null },
    ...partial,
  };
}

describe('createSelectionPlugin', () => {
  it('click node selects it (single select)', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ]);
    const plugin = createSelectionPlugin();

    const res = plugin.handlers!.onPointerDown!(pe({ world: { x: 10, y: 10 } }), ctx);
    expect(res).toEqual({ handled: true, mode: 'continue' });
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('shift-click toggles selection', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ]);
    const plugin = createSelectionPlugin();

    store.set(STORE_KEYS.selectionIds, ['a']);
    plugin.handlers!.onPointerDown!(pe({ world: { x: 210, y: 10 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }), ctx);
    expect(new Set(store.get<string[]>(STORE_KEYS.selectionIds))).toEqual(new Set(['a', 'b']));

    plugin.handlers!.onPointerDown!(pe({ world: { x: 10, y: 10 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['b']);
  });

  it('blank click clears selection (when clearOnBlankClick=true) but shift keeps', () => {
    const { ctx, store } = makeCtx([{ id: 'a', x: 0, y: 0, width: 100, height: 80 }]);
    const plugin = createSelectionPlugin({ clearOnBlankClick: true });
    store.set(STORE_KEYS.selectionIds, ['a']);

    // blank click => clear
    plugin.handlers!.onPointerDown!(pe({ world: { x: 500, y: 500 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual([]);

    // shift blank click => keep
    store.set(STORE_KEYS.selectionIds, ['a']);
    plugin.handlers!.onPointerDown!(pe({ world: { x: 500, y: 500 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('locked/hidden nodes are not selectable', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 80, locked: true },
      { id: 'b', x: 200, y: 0, width: 100, height: 80, hidden: true },
      { id: 'c', x: 400, y: 0, width: 100, height: 80 },
    ]);
    const plugin = createSelectionPlugin();
    store.set(STORE_KEYS.selectionIds, ['c']);

    const res1 = plugin.handlers!.onPointerDown!(pe({ world: { x: 10, y: 10 } }), ctx);
    expect(res1).toEqual({ handled: true, mode: 'continue' });
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['c']);

    const res2 = plugin.handlers!.onPointerDown!(pe({ world: { x: 210, y: 10 } }), ctx);
    expect(res2).toEqual({ handled: true, mode: 'continue' });
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['c']);
  });

  it('click on resize handle does not clear selection (continue propagation)', () => {
    const { ctx, store } = makeCtx([{ id: 'a', x: 0, y: 0, width: 100, height: 80 }]);
    const plugin = createSelectionPlugin({ clearOnBlankClick: true });
    store.set(STORE_KEYS.selectionIds, ['a']);

    const res = plugin.handlers!.onPointerDown!(
      pe({
        world: { x: 500, y: 500 }, // 即便 world 在空白处，只要 target 表示 handle，就不应清空
        originalEvent: {
          target: {
            closest: (sel: string) => (sel.includes('[data-handle]') ? ({} as any) : null),
          },
        } as any,
      }),
      ctx
    );

    expect(res).toEqual({ handled: true, mode: 'continue' });
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });
});

