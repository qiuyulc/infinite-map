import { describe, expect, it, vi } from 'vitest';
import type { MapContext } from '@qiuyulc/infinite-map';
import { createEventBus, createStore, STORE_KEYS } from '@qiuyulc/infinite-map';
import { bboxOf, getViewportCenterWorld, setSnapGuides, snapToGrid } from '../editor/snapUtils';

function makeCtx() {
  const store = createStore();
  const bus = createEventBus();
  const requestRender = vi.fn();
  const ctx: MapContext = {
    store,
    bus,
    services: {},
    registerService: () => {},
    getService: () => undefined,
    getCamera: () => ({ x: 10, y: 20, zoom: 2 } as any),
    getViewport: () => ({ w: 100, h: 80 }),
    getNodes: () => [],
    getVisibleNodes: () => [],
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    queryNodesInWorldRect: () => [],
    applyPatches: () => {},
    requestRender,
  } as any;
  return { ctx, requestRender };
}

describe('snapUtils', () => {
  it('snapToGrid rounds to nearest grid multiple', () => {
    expect(snapToGrid(11, 10)).toBe(10);
    expect(snapToGrid(16, 10)).toBe(20);
  });

  it('bboxOf computes bounding box', () => {
    const b = bboxOf([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 5, width: 5, height: 5 },
    ]);
    expect(b).toEqual({ x: 0, y: 0, w: 25, h: 10 });
  });

  it('setSnapGuides avoids writes when disabled, and clears leftovers', () => {
    const { ctx, requestRender } = makeCtx();
    ctx.store.set(STORE_KEYS.snapConfig, { enabled: false, gridSize: 10, thresholdPx: 6 });
    ctx.store.set('x', { v: [1], h: [2] });
    setSnapGuides(ctx, { v: [1], h: [2] }, 'x');
    expect(ctx.store.get('x')).toBeNull();
    expect(requestRender).toHaveBeenCalled();
  });

  it('getViewportCenterWorld returns center in world coordinates', () => {
    const { ctx } = makeCtx();
    const p = getViewportCenterWorld(ctx);
    // cam.x + (w/2)/z = 10 + 50/2 = 35
    expect(p.x).toBe(35);
    expect(p.y).toBe(40);
  });
});

