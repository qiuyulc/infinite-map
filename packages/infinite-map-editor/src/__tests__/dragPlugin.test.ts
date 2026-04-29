import { describe, expect, it } from 'vitest';
import {
  applyPatchesToNodes,
  createEventBus,
  createStore,
  STORE_KEYS,
  type Camera,
  type HitTestTarget,
  type NodeData,
  type ChangeMeta,
  type MapContext,
  type MapPointerEvent,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import { createDragPlugin } from '../plugins/createDragPlugin';

function makePointerEvent(type: 'down' | 'move' | 'up' | 'cancel', world: { x: number; y: number }, pointerId = 1): MapPointerEvent {
  return {
    type,
    pointerId,
    button: 0,
    buttons: 1,
    screen: { x: 0, y: 0 },
    world,
    modifiers: { alt: false, shift: false, ctrl: false, meta: false },
    originalEvent: { target: null },
  };
}

describe('createDragPlugin', () => {
  it('generates move patches across move/end phases', () => {
    const bus = createEventBus();
    const store = createStore();
    store.set(STORE_KEYS.keyboardSpace, false);

    let nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40 }];
    const patchesApplied: Array<{ patches: NodePatch[]; meta: ChangeMeta }> = [];

    const ctx: MapContext = {
      getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
      getViewport: () => ({ w: 800, h: 600 }),
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
        patchesApplied.push({ patches, meta });
        nodes = applyPatchesToNodes(nodes, patches);
      },
    } as MapContext;

    const drag = createDragPlugin();
    const g = drag.gestures![0];
    const down = makePointerEvent('down', { x: 10, y: 10 }, 7);
    const move = makePointerEvent('move', { x: 110, y: 10 }, 7);
    const up = makePointerEvent('up', { x: 110, y: 10 }, 7);

    const hit = { kind: 'node', id: 'a' } satisfies HitTestTarget;
    expect(g.canStart(down, ctx, hit)).toBe(true);
    g.onStart(down, ctx, hit);
    expect(store.get(STORE_KEYS.dragState)).toBeTruthy();

    g.onMove(move, ctx);
    g.onEnd(up, ctx);

    // after end, node should be moved to x=100
    expect(nodes.find((n) => n.id === 'a')?.x).toBe(100);

    // should have at least one move phase apply + one end phase apply
    expect(patchesApplied.some((x) => x.meta.phase === 'move')).toBe(true);
    expect(patchesApplied.some((x) => x.meta.phase === 'end')).toBe(true);
  });

  it('does not start drag on locked/hidden nodes', () => {
    const bus = createEventBus();
    const store = createStore();
    store.set(STORE_KEYS.keyboardSpace, false);

    const nodes: NodeData[] = [
      { id: 'locked', x: 0, y: 0, width: 80, height: 40, locked: true },
      { id: 'hidden', x: 200, y: 0, width: 80, height: 40, hidden: true },
      { id: 'ok', x: 400, y: 0, width: 80, height: 40 },
    ];

    const ctx: MapContext = {
      getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
      getViewport: () => ({ w: 800, h: 600 }),
      getNodes: () => nodes,
      getVisibleNodes: () => nodes.filter((n) => !n.hidden),
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

    const drag = createDragPlugin();
    const g = drag.gestures![0];
    store.set(STORE_KEYS.selectionIds, ['locked', 'hidden', 'ok']);

    const down = makePointerEvent('down', { x: 10, y: 10 }, 1);
    expect(g.canStart(down, ctx, { kind: 'node', id: 'locked' })).toBe(false);
    expect(g.canStart(down, ctx, { kind: 'node', id: 'hidden' })).toBe(false);
    expect(g.canStart(down, ctx, { kind: 'node', id: 'ok' })).toBe(true);
  });

  it('snaps to other visible nodes when snapConfig.enabled=true', () => {
    const bus = createEventBus();
    const store = createStore();
    store.set(STORE_KEYS.keyboardSpace, false);
    store.set(STORE_KEYS.snapConfig, { enabled: true, thresholdPx: 20, gridSize: 50 });
    store.set(STORE_KEYS.minimapInViewCount, 1);

    let nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 10, height: 10 },
      { id: 'b', x: 100, y: 0, width: 10, height: 10 },
    ];

    const patchesApplied: Array<{ patches: NodePatch[]; meta: ChangeMeta }> = [];
    const ctx: MapContext = {
      getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
      getViewport: () => ({ w: 800, h: 600 }),
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
        patchesApplied.push({ patches, meta });
        nodes = applyPatchesToNodes(nodes, patches);
      },
    } as MapContext;

    const drag = createDragPlugin();
    const g = drag.gestures![0];
    const down = makePointerEvent('down', { x: 0, y: 0 }, 9);
    // move close to b.x=100; dx=93 => center is 98, should snap +2 => 95
    const move = makePointerEvent('move', { x: 93, y: 0 }, 9);
    const up = makePointerEvent('up', { x: 93, y: 0 }, 9);

    const hit = { kind: 'node', id: 'a' } satisfies HitTestTarget;
    g.onStart(down, ctx, hit);
    g.onMove(move, ctx);
    g.onEnd(up, ctx);

    expect(nodes.find((n) => n.id === 'a')?.x).toBe(95);
    expect(patchesApplied.some((x) => x.meta.phase === 'move')).toBe(true);
  });

  it('selectOnDrag=true selects the hit node when dragging unselected node', () => {
    const bus = createEventBus();
    const store = createStore();
    store.set(STORE_KEYS.keyboardSpace, false);

    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40 }];
    const ctx: MapContext = {
      getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
      getViewport: () => ({ w: 800, h: 600 }),
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

    store.set(STORE_KEYS.selectionIds, []); // initially empty
    const drag = createDragPlugin({ selectOnDrag: true });
    const g = drag.gestures![0];
    const down = makePointerEvent('down', { x: 1, y: 1 }, 2);
    expect(g.canStart(down, ctx, { kind: 'node', id: 'a' })).toBe(true);
    g.onStart(down, ctx, { kind: 'node', id: 'a' } as any);
    expect(store.get(STORE_KEYS.selectionIds)).toEqual(['a']);
  });

  it('Engine mode updates DOM transform on move and resets on end', () => {
    const bus = createEventBus();
    const store = createStore();
    store.set(STORE_KEYS.keyboardSpace, false);

    let nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40 }];
    const el = document.createElement('div');
    el.style.transform = 'rotate(10deg)';

    const ctx: MapContext = {
      getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
      getViewport: () => ({ w: 800, h: 600 }),
      getNodes: () => nodes,
      getVisibleNodes: () => nodes,
      queryNodesInWorldRect: () => nodes,
      screenToWorld: (p) => p,
      worldToScreen: (p) => p,
      rectScreenToWorld: (r) => r,
      rectWorldToScreen: (r) => r,
      bus,
      store,
      services: {
        engine: { store: {}, cameraRef: { current: { x: 0, y: 0, zoom: 1 } } },
        'dom-nodes': { getEl: (id: string) => (id === 'a' ? el : null) },
      },
      registerService: () => void 0,
      getService: (id: string) => (ctx as any).services[id],
      requestRender: () => void 0,
      applyPatches: (patches: NodePatch[], _meta: ChangeMeta) => {
        nodes = applyPatchesToNodes(nodes, patches);
      },
    } as any;

    store.set(STORE_KEYS.selectionIds, ['a']);
    const drag = createDragPlugin();
    const g = drag.gestures![0];

    const down = makePointerEvent('down', { x: 0, y: 0 }, 7);
    const move = makePointerEvent('move', { x: 10, y: 0 }, 7);
    const up = makePointerEvent('up', { x: 10, y: 0 }, 7);

    g.onStart(down, ctx, { kind: 'node', id: 'a' } as any);
    g.onMove(move, ctx);
    // move stage should set translate before base transform
    expect(el.style.transform).toContain('translate3d(10px, 0px, 0)');
    expect(el.style.transform).toContain('rotate(10deg)');

    g.onEnd(up, ctx);
    // end resets transform to base
    expect(el.style.transform).toBe('rotate(10deg)');
    expect(nodes.find((n) => n.id === 'a')?.x).toBe(10);
  });
});
