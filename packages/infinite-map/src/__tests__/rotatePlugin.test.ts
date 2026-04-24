import { describe, expect, it } from 'vitest';
import type { Camera, NodeData } from '../core/types';
import { applyPatchesToNodes, createEventBus, createStore } from '../editor/runtime';
import type { ChangeMeta, MapContext, MapPointerEvent, NodePatch } from '../editor/types';
import { STORE_KEYS } from '../editor/keys';
import { createRotatePlugin } from '../editor/plugins/transform/createRotatePlugin';

function makeCtx(initialNodes: NodeData[], services?: Record<string, any>) {
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
    services: services ?? {},
    registerService: () => void 0,
    getService: (id) => (services ?? {})[id],
    requestRender: () => void 0,
    applyPatches: (patches: NodePatch[], _meta: ChangeMeta) => {
      nodes = applyPatchesToNodes(nodes, patches);
    },
  } as MapContext;

  return { ctx, store, getNodes: () => nodes };
}

function pe(type: MapPointerEvent['type'], partial: Partial<MapPointerEvent> & { world: { x: number; y: number } }): MapPointerEvent {
  const { world, ...rest } = partial;
  return {
    type,
    pointerId: 7,
    button: 0,
    buttons: type === 'up' ? 0 : 1,
    screen: { x: world.x, y: world.y },
    world,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    // 让 rotate 插件认为命中了 rotate handle
    originalEvent: { target: { closest: () => ({} as any) } } as any,
    ...rest,
  } as MapPointerEvent;
}

describe('createRotatePlugin', () => {
  it('rotates selected nodes and normalizes rotation into [0, 360)', () => {
    const { ctx, store, getNodes } = makeCtx([{ id: 'a', x: 0, y: 0, width: 100, height: 100, rotation: 350 }]);
    store.set(STORE_KEYS.selectionIds, ['a']);

    const plugin = createRotatePlugin();

    // rotation center will be node center (50,50)
    // start angle at (100,50) => 0 rad; move to (50,100) => 90deg
    plugin.handlers!.onPointerDown!(pe('down', { world: { x: 100, y: 50 } }), ctx);
    plugin.handlers!.onPointerMove!(pe('move', { world: { x: 50, y: 100 } }), ctx);
    plugin.handlers!.onPointerUp!(pe('up', { world: { x: 50, y: 100 } }), ctx);

    const a = getNodes().find((n) => n.id === 'a')!;
    // 350 + 90 = 440 => normalize => 80
    expect(a.rotation).toBe(80);
  });

  it('excludes group nodes from rotation but includes expanded descendants', () => {
    const groupSvc = {
      expandIds: (ids: string[]) => {
        if (ids.includes('g')) return ['g', 'c1', 'c2'];
        return ids;
      },
    };

    const { ctx, store, getNodes } = makeCtx(
      [
        { id: 'g', kind: 'group', x: 0, y: 0, width: 200, height: 200 },
        { id: 'c1', parentId: 'g', x: 20, y: 20, width: 20, height: 20 },
        { id: 'c2', parentId: 'g', x: 120, y: 120, width: 20, height: 20 },
      ],
      { group: groupSvc }
    );
    store.set(STORE_KEYS.selectionIds, ['g']);

    const plugin = createRotatePlugin();
    plugin.handlers!.onPointerDown!(pe('down', { world: { x: 200, y: 100 } }), ctx);
    plugin.handlers!.onPointerMove!(pe('move', { world: { x: 100, y: 200 } }), ctx);
    plugin.handlers!.onPointerUp!(pe('up', { world: { x: 100, y: 200 } }), ctx);

    const g = getNodes().find((n) => n.id === 'g')!;
    const c1 = getNodes().find((n) => n.id === 'c1')!;
    const c2 = getNodes().find((n) => n.id === 'c2')!;

    // group 本身不参与旋转
    expect(g.rotation).toBeUndefined();
    // 成员应当被 set rotation
    expect(typeof c1.rotation).toBe('number');
    expect(typeof c2.rotation).toBe('number');
  });

  it('locked/hidden nodes cannot be rotated', () => {
    const { ctx, store, getNodes } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 100, height: 100, locked: true },
      { id: 'b', x: 200, y: 0, width: 100, height: 100 },
    ]);
    store.set(STORE_KEYS.selectionIds, ['a']);

    const plugin = createRotatePlugin();
    const res = plugin.handlers!.onPointerDown!(pe('down', { world: { x: 100, y: 50 } }), ctx);
    expect(res).toEqual({ handled: false });

    // ensure nothing changed
    expect(getNodes().find((n) => n.id === 'a')!.rotation).toBeUndefined();
    expect(getNodes().find((n) => n.id === 'b')!.rotation).toBeUndefined();
  });
});
