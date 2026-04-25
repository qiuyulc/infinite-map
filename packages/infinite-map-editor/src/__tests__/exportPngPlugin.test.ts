import { describe, expect, it } from 'vitest';
import { createEventBus, createStore, type Camera, type MapContext, type NodeData } from '@qiuyulc/infinite-map';
import { createExportPngPlugin } from '../plugins/createExportPngPlugin';

describe('createExportPngPlugin', () => {
  it('emits export:png event', () => {
    const bus = createEventBus();
    const store = createStore();
    const nodes: NodeData[] = [];

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

    let payload: any = null;
    bus.on('export:png', (p) => (payload = p));

    const p = createExportPngPlugin({ defaultScope: 'selection', fileName: 'a.png' });
    p.commands?.['file.exportPng']?.run(ctx, { source: 'api' });

    expect(payload).toBeTruthy();
    expect(payload.scope).toBe('selection');
    expect(payload.fileName).toBe('a.png');
    expect(payload.source).toBe('api');
  });
});

