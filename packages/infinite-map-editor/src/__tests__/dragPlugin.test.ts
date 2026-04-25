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
});
