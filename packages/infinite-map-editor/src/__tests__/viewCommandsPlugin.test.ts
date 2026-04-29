import { describe, expect, it, vi } from 'vitest';
import type { Camera, MapContext, NodeData } from '@qiuyulc/infinite-map';
import { createEventBus, createStore, STORE_KEYS } from '@qiuyulc/infinite-map';
import { createViewCommandsPlugin, getViewLimits } from '../plugins/createViewCommandsPlugin';

function makeCtx(nodes: NodeData[] = []) {
  const store = createStore();
  const bus = createEventBus();
  const services: Record<string, unknown> = {};
  let cam: Camera = { x: 0, y: 0, zoom: 1 };
  const set = vi.fn((next: Camera) => {
    cam = next;
  });
  services.camera = { get: () => cam, set };
  services.selection = { getIds: () => [] };

  const ctx: MapContext = {
    store,
    bus,
    services,
    registerService: (name: string, s: unknown) => (services[name] = s),
    getService: (name: string) => services[name] as any,
    getCamera: () => cam,
    getViewport: () => ({ w: 1000, h: 800 }),
    getNodes: () => nodes,
    getVisibleNodes: () => nodes,
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    queryNodesInWorldRect: () => [],
    applyPatches: () => {},
    requestRender: () => {},
  } as any;
  return { ctx, getCam: () => cam, set };
}

describe('createViewCommandsPlugin', () => {
  it('setup writes viewConfig with defaults / overrides', () => {
    const { ctx } = makeCtx();
    const plugin = createViewCommandsPlugin({ minZoom: 0.1, zoomStep: 1.5 });
    plugin.setup?.(ctx);

    const limits = getViewLimits(ctx);
    expect(limits.minZoom).toBe(0.1);
    expect(limits.zoomStep).toBe(1.5);
    expect(ctx.store.get(STORE_KEYS.viewConfig)).toBeTruthy();
  });

  it('zoomIn/zoomOut/resetZoom set camera zoom', () => {
    const { ctx, getCam, set } = makeCtx();
    const plugin = createViewCommandsPlugin({ minZoom: 0.5, maxZoom: 2, zoomStep: 2 });
    plugin.setup?.(ctx);

    plugin.commands?.['view.zoomIn']?.run(ctx);
    expect(set).toHaveBeenCalled();
    expect(getCam().zoom).toBe(2);

    plugin.commands?.['view.zoomOut']?.run(ctx);
    expect(getCam().zoom).toBe(1);

    plugin.commands?.['view.resetZoom']?.run(ctx);
    expect(getCam().zoom).toBe(1);
  });

  it('fitView centers and zooms to include nodes + origin', () => {
    const nodes: NodeData[] = [{ id: 'a', type: 'default', x: 100, y: 50, width: 200, height: 100, data: {} }];
    const { ctx, getCam } = makeCtx(nodes);
    const plugin = createViewCommandsPlugin({ paddingPx: 0, minZoom: 0.25, maxZoom: 2.5 });
    plugin.setup?.(ctx);

    plugin.commands?.['view.fitView']?.run(ctx);
    const cam = getCam();
    expect(cam.zoom).toBeGreaterThan(0);
    expect(Number.isFinite(cam.x)).toBe(true);
    expect(Number.isFinite(cam.y)).toBe(true);
  });
});

