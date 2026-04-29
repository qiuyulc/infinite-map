import { describe, expect, it, vi } from 'vitest';
import { createStore, STORE_KEYS, type MapContext } from '@qiuyulc/infinite-map';
import { createKeyboardStatePlugin } from '../plugins/createKeyboardStatePlugin';

function makeCtx() {
  const store = createStore();
  const requestRender = vi.fn();
  const ctx: MapContext = {
    store,
    bus: { on: () => () => void 0, emit: () => void 0 } as any,
    services: {},
    registerService: () => void 0,
    getService: () => undefined,
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } as any),
    getViewport: () => ({ w: 1, h: 1 }),
    getNodes: () => [],
    getVisibleNodes: () => [],
    queryNodesInWorldRect: () => [],
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    applyPatches: () => {},
    requestRender,
  } as any;
  return { ctx, requestRender };
}

describe('createKeyboardStatePlugin', () => {
  it('sets STORE_KEYS.keyboardSpace on Space down/up', () => {
    const { ctx, requestRender } = makeCtx();
    const plugin = createKeyboardStatePlugin();

    plugin.input!.onKeyDown!({ code: 'Space' } as any, ctx);
    expect(ctx.store.get(STORE_KEYS.keyboardSpace)).toBe(true);
    expect(requestRender).toHaveBeenCalled();

    plugin.input!.onKeyUp!({ code: 'Space' } as any, ctx);
    expect(ctx.store.get(STORE_KEYS.keyboardSpace)).toBe(false);
  });
});

