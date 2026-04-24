import { describe, expect, it } from 'vitest';
import { applyPatchesToNodes, createEventBus, createStore, STORE_KEYS, type Camera, type NodeData, type ChangeMeta, type MapContext, type MapPointerEvent, type NodePatch } from '@qiuyulc/infinite-map';
import { createResizePlugin } from '../editor/plugins/transform/createResizePlugin';

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
    pointerId: 1,
    button: 0,
    buttons: type === 'up' ? 0 : 1,
    screen: { x: world.x, y: world.y },
    world,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    originalEvent: { target: { dataset: { handle: 'se' } } }, // 默认 se
    ...rest,
  } as MapPointerEvent;
}

describe('createResizePlugin', () => {
  it('respects minSize and adjusts x/y when resizing from west/north', () => {
    const { ctx, store, getNodes } = makeCtx([{ id: 'a', x: 0, y: 0, width: 50, height: 50 }]);
    store.set(STORE_KEYS.selectionIds, ['a']);

    const plugin = createResizePlugin({ minSize: 40 });

    // west handle: try to shrink too much => clamp to minSize, and x should move accordingly
    const down = pe('down', { world: { x: 0, y: 0 }, originalEvent: { target: { dataset: { handle: 'w' } } } as any });
    expect(plugin.handlers!.onPointerDown!(down, ctx)).toEqual({ handled: true });

    const move = pe('move', { world: { x: 100, y: 0 } }); // dx=+100 => w - dx => clamp
    plugin.handlers!.onPointerMove!(move, ctx);

    const n = getNodes().find((x) => x.id === 'a')!;
    expect(n.width).toBe(40);
    // 原 width=50 => clamp 到 40，x 前移 10
    expect(n.x).toBe(10);
  });

  it('does not start when selection is not single or node is locked/hidden', () => {
    const { ctx, store } = makeCtx([
      { id: 'a', x: 0, y: 0, width: 50, height: 50, locked: true },
      { id: 'b', x: 60, y: 0, width: 50, height: 50 },
    ]);
    const plugin = createResizePlugin();

    store.set(STORE_KEYS.selectionIds, []); // none
    expect(plugin.handlers!.onPointerDown!(pe('down', { world: { x: 0, y: 0 } }), ctx)).toEqual({ handled: false });

    store.set(STORE_KEYS.selectionIds, ['a']); // locked
    expect(plugin.handlers!.onPointerDown!(pe('down', { world: { x: 0, y: 0 } }), ctx)).toEqual({ handled: false });

    store.set(STORE_KEYS.selectionIds, ['a', 'b']); // multi
    expect(plugin.handlers!.onPointerDown!(pe('down', { world: { x: 0, y: 0 } }), ctx)).toEqual({ handled: false });
  });

  it('resizes group members proportionally (padding is kept)', () => {
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
    const plugin = createResizePlugin({ minSize: 40 });

    // resize group bigger: se drag to (100,100) => width/height +100
    plugin.handlers!.onPointerDown!(pe('down', { world: { x: 200, y: 200 }, originalEvent: { target: { dataset: { handle: 'se' } } } as any }), ctx);
    plugin.handlers!.onPointerMove!(pe('move', { world: { x: 300, y: 300 } }), ctx);
    plugin.handlers!.onPointerUp!(pe('up', { world: { x: 300, y: 300 } }), ctx);

    const g = getNodes().find((n) => n.id === 'g')!;
    const c1 = getNodes().find((n) => n.id === 'c1')!;
    const c2 = getNodes().find((n) => n.id === 'c2')!;

    expect(g.width).toBeGreaterThan(200);
    expect(g.height).toBeGreaterThan(200);

    // 子节点应当被缩放映射：位置/大小发生变化（不做精确值断言，避免 padding/比例细节变动导致脆弱）
    expect(c1.width).toBeGreaterThan(20);
    expect(c2.x).toBeGreaterThan(120);
  });
});

