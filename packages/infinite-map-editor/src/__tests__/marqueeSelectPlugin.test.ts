import { describe, expect, it } from 'vitest';
import { createEventBus, createStore, STORE_KEYS, type Camera, type HitTestTarget, type NodeData, type MapContext, type MapPointerEvent } from '@qiuyulc/infinite-map';
import { createMarqueeSelectPlugin } from '../plugins/createMarqueeSelectPlugin';

function makeCtx(nodes: NodeData[]) {
  const bus = createEventBus();
  const store = createStore();

  const ctx: MapContext = {
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
    getViewport: () => ({ w: 1000, h: 800 }),
    getNodes: () => nodes,
    getVisibleNodes: () => nodes,
    queryNodesInWorldRect: () => nodes, // 简化：返回全部候选
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

  return { ctx, store };
}

function pe(type: MapPointerEvent['type'], partial: Partial<MapPointerEvent> & { screen: { x: number; y: number }; world: { x: number; y: number } }): MapPointerEvent {
  return {
    type,
    pointerId: 1,
    button: 0,
    buttons: type === 'up' ? 0 : 1,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    originalEvent: { target: null },
    ...partial,
  };
}

describe('createMarqueeSelectPlugin', () => {
  it('requireShift=true: without shift it should not start marquee', () => {
    const { ctx } = makeCtx([{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]);
    const plugin = createMarqueeSelectPlugin({ requireShift: true });
    const g = plugin.gestures![0];
    const down = pe('down', { screen: { x: 500, y: 500 }, world: { x: 500, y: 500 } });
    expect(g.canStart(down, ctx, { kind: 'blank' } satisfies HitTestTarget)).toBe(false);
  });

  it('drag selects intersecting nodes; locked/hidden are excluded', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 10, height: 10 },
      { id: 'b', x: 20, y: 0, width: 10, height: 10, locked: true },
      { id: 'c', x: 0, y: 20, width: 10, height: 10, hidden: true },
      { id: 'd', x: 20, y: 20, width: 10, height: 10 },
    ]);
    const plugin = createMarqueeSelectPlugin({ minDragPx: 1 });
    const g = plugin.gestures![0];

    // 框选 [ -5,-5 ] -> [ 25,25 ] 命中 a,b,c,d，但 b/c 被过滤
    const down = pe('down', { screen: { x: -5, y: -5 }, world: { x: -5, y: -5 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } });
    expect(g.canStart(down, ctx, { kind: 'blank' } satisfies HitTestTarget)).toBe(true);
    g.onStart(down, ctx, { kind: 'blank' } satisfies HitTestTarget);
    g.onMove(pe('move', { screen: { x: 25, y: 25 }, world: { x: 25, y: 25 } }), ctx);
    g.onEnd(pe('up', { screen: { x: 25, y: 25 }, world: { x: 25, y: 25 } }), ctx);

    expect(new Set(store.get<string[]>(STORE_KEYS.selectionIds))).toEqual(new Set(['a', 'd']));
  });

  it('shift=true unions selection; click blank clears unless shift', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 10, height: 10 },
      { id: 'b', x: 30, y: 0, width: 10, height: 10 },
    ]);
    const plugin = createMarqueeSelectPlugin({ minDragPx: 1 });
    const g = plugin.gestures![0];
    store.set(STORE_KEYS.selectionIds, ['b']);

    // shift marquee selects a, union => a+b
    const down1 = pe('down', { screen: { x: -5, y: -5 }, world: { x: -5, y: -5 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } });
    g.onStart(down1, ctx, { kind: 'blank' } satisfies HitTestTarget);
    g.onMove(pe('move', { screen: { x: 12, y: 12 }, world: { x: 12, y: 12 } }), ctx);
    g.onEnd(pe('up', { screen: { x: 12, y: 12 }, world: { x: 12, y: 12 } }), ctx);
    expect(new Set(store.get<string[]>(STORE_KEYS.selectionIds))).toEqual(new Set(['a', 'b']));

    // blank click (no shift) => clear
    g.onStart(pe('down', { screen: { x: 500, y: 500 }, world: { x: 500, y: 500 } }), ctx, { kind: 'blank' } satisfies HitTestTarget);
    g.onEnd(pe('up', { screen: { x: 500, y: 500 }, world: { x: 500, y: 500 } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual([]);

    // blank click with shift => keep
    store.set(STORE_KEYS.selectionIds, ['a']);
    const down2 = pe('down', { screen: { x: 500, y: 500 }, world: { x: 500, y: 500 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } });
    g.onStart(down2, ctx, { kind: 'blank' } satisfies HitTestTarget);
    g.onEnd(pe('up', { screen: { x: 500, y: 500 }, world: { x: 500, y: 500 }, modifiers: { shift: true, alt: false, ctrl: false, meta: false } }), ctx);
    expect(store.get<string[]>(STORE_KEYS.selectionIds)).toEqual(['a']);
  });
});
