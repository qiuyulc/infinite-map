import { describe, expect, it, vi } from 'vitest';
import type { MapContext, NodeData, NodePatch } from '@qiuyulc/infinite-map';
import { createEventBus, createStore, STORE_KEYS } from '@qiuyulc/infinite-map';
import { createRotate3DPlugin } from '../plugins/createRotate3DPlugin';

function makeCtx(nodes: NodeData[]) {
  const store = createStore();
  const bus = createEventBus();
  const services: Record<string, unknown> = {};
  const applyPatches = vi.fn<(patches: NodePatch[], meta: any) => void>();
  const requestRender = vi.fn();
  const ctx: MapContext = {
    store,
    bus,
    services,
    registerService: (name: string, s: unknown) => (services[name] = s),
    getService: (name: string) => services[name] as any,
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } as any),
    getViewport: () => ({ w: 800, h: 600 }),
    getNodes: () => nodes,
    getVisibleNodes: () => nodes,
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    queryNodesInWorldRect: () => [],
    applyPatches,
    requestRender,
  } as any;
  return { ctx, applyPatches, requestRender };
}

describe('createRotate3DPlugin', () => {
  it('gesture canStart respects alt modifier and node hit', () => {
    const nodes: NodeData[] = [{ id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, data: {} }];
    const { ctx } = makeCtx(nodes);
    const plugin = createRotate3DPlugin();
    const g = plugin.gestures?.[0]!;

    expect(
      g.canStart?.({ button: 0, modifiers: { alt: true }, pointerId: 1 } as any, ctx, { kind: 'node', id: 'a' } as any)
    ).toBe(true);
    expect(
      g.canStart?.({ button: 0, modifiers: { alt: false }, pointerId: 1 } as any, ctx, { kind: 'node', id: 'a' } as any)
    ).toBe(false);
  });

  it('start/move/end writes patches and clears state', () => {
    const nodes: NodeData[] = [{ id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, data: {} }];
    const { ctx, applyPatches } = makeCtx(nodes);
    const plugin = createRotate3DPlugin();
    const g = plugin.gestures?.[0]!;

    g.onStart?.({ pointerId: 1, button: 0, screen: { x: 10, y: 10 }, modifiers: { alt: true } } as any, ctx, { kind: 'node', id: 'a' } as any);
    expect(ctx.store.get(STORE_KEYS.rotate3dState)).toBeTruthy();

    g.onMove?.({ pointerId: 1, screen: { x: 30, y: 0 } } as any, ctx);
    expect(applyPatches).toHaveBeenCalled();

    g.onEnd?.({ pointerId: 1, screen: { x: 30, y: 0 } } as any, ctx);
    expect(ctx.store.get(STORE_KEYS.rotate3dState)).toBeNull();
  });
});

