import { describe, expect, it } from 'vitest';
import {
  applyPatchesToNodes,
  createEventBus,
  createStore,
  type Camera,
  type ChangeMeta,
  type MapContext,
  type NodeData,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import { createAlignDistributePlugin } from '../plugins/createAlignDistributePlugin';

function makeCtx(initialNodes: NodeData[], selectionIds: string[]) {
  const bus = createEventBus();
  const store = createStore();
  let nodes = initialNodes;

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
    registerService: (name, service) => ((ctx.services as any)[name] = service),
    getService: (name) => (ctx.services as any)[name],
    requestRender: () => void 0,
    applyPatches: (patches: NodePatch[], _meta: ChangeMeta) => {
      nodes = applyPatchesToNodes(nodes, patches);
    },
  } as MapContext;

  ctx.registerService('selection', { getIds: () => selectionIds });
  ctx.registerService('document', { applyPatches: (patches: NodePatch[], meta: ChangeMeta) => ctx.applyPatches(patches, meta) });
  return { ctx, getNodes: () => nodes };
}

describe('createAlignDistributePlugin', () => {
  it('align left moves nodes to same x', () => {
    const { ctx, getNodes } = makeCtx(
      [
        { id: 'a', x: 10, y: 0, width: 10, height: 10 },
        { id: 'b', x: 30, y: 0, width: 10, height: 10 },
      ],
      ['a', 'b']
    );
    const p = createAlignDistributePlugin();
    p.commands?.['edit.alignLeft']?.run(ctx, { source: 'api' });
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(10);
    expect(getNodes().find((n) => n.id === 'b')?.x).toBe(10);
  });

  it('distribute horizontally sets equal gaps', () => {
    const { ctx, getNodes } = makeCtx(
      [
        { id: 'a', x: 0, y: 0, width: 10, height: 10 },
        { id: 'b', x: 30, y: 0, width: 10, height: 10 },
        { id: 'c', x: 90, y: 0, width: 10, height: 10 },
      ],
      ['a', 'b', 'c']
    );
    const p = createAlignDistributePlugin();
    p.commands?.['edit.distributeH']?.run(ctx, { source: 'api' });

    const a = getNodes().find((n) => n.id === 'a')!;
    const b = getNodes().find((n) => n.id === 'b')!;
    const c = getNodes().find((n) => n.id === 'c')!;
    const gap1 = b.x - (a.x + a.width);
    const gap2 = c.x - (b.x + b.width);
    expect(gap1).toBeCloseTo(gap2, 6);
  });
});

