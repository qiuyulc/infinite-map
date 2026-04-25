import { describe, expect, it } from 'vitest';
import {
  applyPatchesToNodes,
  createEventBus,
  createStore,
  type Camera,
  type ChangeMeta,
  type MapContext,
  type MapKeyEvent,
  type NodeData,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import { createNudgePlugin } from '../plugins/createNudgePlugin';

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

function keyEvent(key: string, shift = false): MapKeyEvent {
  return {
    type: 'down',
    key,
    code: key,
    modifiers: { alt: false, ctrl: false, meta: false, shift },
    originalEvent: {},
  };
}

describe('createNudgePlugin', () => {
  it('nudges selected nodes by 1 with arrow keys', () => {
    const { ctx, getNodes } = makeCtx([{ id: 'a', x: 10, y: 10, width: 10, height: 10 }], ['a']);
    const p = createNudgePlugin({ step: 1, stepLarge: 10 });
    p.input?.onKeyDown?.(keyEvent('ArrowRight'), ctx);
    expect(getNodes().find((n) => n.id === 'a')?.x).toBe(11);
  });

  it('nudges by stepLarge when shift is pressed', () => {
    const { ctx, getNodes } = makeCtx([{ id: 'a', x: 10, y: 10, width: 10, height: 10 }], ['a']);
    const p = createNudgePlugin({ step: 1, stepLarge: 10 });
    p.input?.onKeyDown?.(keyEvent('ArrowDown', true), ctx);
    expect(getNodes().find((n) => n.id === 'a')?.y).toBe(20);
  });
});

