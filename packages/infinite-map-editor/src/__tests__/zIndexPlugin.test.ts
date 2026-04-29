import { describe, expect, it, vi } from 'vitest';
import type { MapContext, NodeData, NodePatch } from '@qiuyulc/infinite-map';
import { createEventBus, createStore } from '@qiuyulc/infinite-map';
import { createZIndexPlugin } from '../plugins/createZIndexPlugin';

function makeCtx(nodes: NodeData[], selectedIds: string[]) {
  const store = createStore();
  const bus = createEventBus();
  const services: Record<string, unknown> = {};
  const applyPatches = vi.fn<(patches: NodePatch[], meta: any) => void>();
  const requestRender = vi.fn();
  services.selection = { getIds: () => selectedIds };
  services.document = { applyPatches };
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
    applyPatches: () => {},
    requestRender,
  } as any;
  return { ctx, applyPatches, requestRender };
}

describe('createZIndexPlugin', () => {
  it('bringToFront reorders z for selected nodes', () => {
    const nodes: NodeData[] = [
      { id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 0, data: {} },
      { id: 'b', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 1, data: {} },
      { id: 'c', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 2, data: {} },
    ];
    const { ctx, applyPatches, requestRender } = makeCtx(nodes, ['a']);
    const plugin = createZIndexPlugin();

    plugin.commands?.['z.bringToFront']?.run(ctx);

    expect(applyPatches).toHaveBeenCalled();
    const patches = (applyPatches.mock.calls[0]![0] ?? []) as NodePatch[];
    // expected order: b(0), c(1), a(2)
    const byId = Object.fromEntries(patches.map((p: any) => [p.id, p.data.z]));
    expect(byId.a).toBe(2);
    expect(byId.b).toBe(0);
    expect(byId.c).toBe(1);
    expect(requestRender).toHaveBeenCalled();
  });

  it('normalize assigns dense z values', () => {
    const nodes: NodeData[] = [
      { id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 10, data: {} },
      { id: 'b', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 30, data: {} },
    ];
    const { ctx, applyPatches } = makeCtx(nodes, []);
    const plugin = createZIndexPlugin();

    plugin.commands?.['z.normalize']?.run(ctx);
    const patches = (applyPatches.mock.calls[0]![0] ?? []) as NodePatch[];
    expect(patches).toHaveLength(2);
    expect((patches.find((p: any) => p.id === 'a') as any).data.z).toBe(0);
    expect((patches.find((p: any) => p.id === 'b') as any).data.z).toBe(1);
  });

  it('sendToBack / bringForward / sendBackward handle selected nodes', () => {
    const nodes: NodeData[] = [
      { id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 0, data: {} },
      { id: 'b', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 1, data: {} },
      { id: 'c', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 2, data: {} },
    ];
    const { ctx, applyPatches } = makeCtx(nodes, ['c']);
    const plugin = createZIndexPlugin();

    plugin.commands?.['z.sendToBack']?.run(ctx);
    let patches = (applyPatches.mock.calls.at(-1)![0] ?? []) as NodePatch[];
    const byId1 = Object.fromEntries(patches.map((p: any) => [p.id, p.data.z]));
    expect(byId1.c).toBe(0);

    plugin.commands?.['z.bringForward']?.run(ctx);
    patches = (applyPatches.mock.calls.at(-1)![0] ?? []) as NodePatch[];
    expect(patches.length).toBeGreaterThan(0);

    plugin.commands?.['z.sendBackward']?.run(ctx);
    patches = (applyPatches.mock.calls.at(-1)![0] ?? []) as NodePatch[];
    expect(patches.length).toBeGreaterThan(0);
  });

  it('does nothing when selection is empty', () => {
    const nodes: NodeData[] = [{ id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, z: 0, data: {} }];
    const { ctx, applyPatches } = makeCtx(nodes, []);
    const plugin = createZIndexPlugin();
    plugin.commands?.['z.bringToFront']?.run(ctx);
    expect(applyPatches).not.toHaveBeenCalled();
  });
});
