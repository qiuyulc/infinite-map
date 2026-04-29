import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { createEventBus, createStore, STORE_KEYS, type Camera, type MapContext } from '@qiuyulc/infinite-map';
import { createHoverHighlightPlugin } from '../plugins/createHoverHighlightPlugin';

afterEach(() => cleanup());

function mockCanvas2d() {
  const g: any = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
    fillStyle: '',
    globalCompositeOperation: '',
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    shadowColor: '',
    shadowBlur: 0,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => g);
  return g;
}

function makeEngineStore() {
  let state: any = { viewport: { w: 200, h: 120 }, view: { x: 0, y: 0, zoom: 1 } };
  return {
    getState: () => state,
    subscribe: (_sel: any, _cb: any) => () => void 0,
  };
}

describe('createHoverHighlightPlugin', () => {
  it('overlay returns null without engine service', () => {
    const plugin = createHoverHighlightPlugin();
    const ctx: MapContext = {
      store: createStore(),
      bus: createEventBus(),
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
      requestRender: () => {},
    } as any;

    const Overlay = plugin.overlay as any;
    const { container } = render(Overlay ? <Overlay ctx={ctx} /> : null);
    expect(container.firstChild).toBeNull();
  });

  it('draw loop runs when wheel triggers pulse', async () => {
    mockCanvas2d();

    const plugin = createHoverHighlightPlugin({ dotSpacing: 48 });
    const store = createStore();
    const bus = createEventBus();
    const camRef = { current: { x: 0, y: 0, zoom: 1 } as Camera };
    const engineStore = makeEngineStore();

    // trigger wheel to seed pulse/mouse
    plugin.input?.onWheel?.({ screen: { x: 20, y: 20 } } as any, {} as any);

    let rafCb: FrameRequestCallback | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => {
      rafCb = cb;
      return 1 as any;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => void 0);

    const ctx: MapContext = {
      store,
      bus,
      services: { engine: { store: engineStore, cameraRef: camRef } },
      registerService: () => void 0,
      getService: (id: string) => (ctx as any).services[id],
      getCamera: () => camRef.current,
      getViewport: () => ({ w: 200, h: 120 }),
      getNodes: () => [],
      getVisibleNodes: () => [],
      queryNodesInWorldRect: () => [],
      screenToWorld: (p) => p,
      worldToScreen: (p) => p,
      rectScreenToWorld: (r) => r,
      rectWorldToScreen: (r) => r,
      applyPatches: () => {},
      requestRender: () => {},
    } as any;

    const Overlay = plugin.overlay as any;
    const { container } = render(Overlay ? <Overlay ctx={ctx} /> : null);
    expect(container.querySelector('canvas')).toBeTruthy();

    // run one frame
    rafCb?.(0);

    // ensure we touched canvas context at least once
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();

    // hover blank clears mouse (coverage for hoverHit subscription path)
    store.set(STORE_KEYS.hoverHit, { kind: 'blank' } as any);

    // cover inputHooks onBeforeHitTest move/cancel branches
    plugin.inputHooks?.onBeforeHitTest?.({ type: 'move', screen: { x: 1, y: 2 } } as any, ctx, { kind: 'pointer' } as any);
    plugin.inputHooks?.onBeforeHitTest?.({ type: 'cancel', screen: { x: 1, y: 2 } } as any, ctx, { kind: 'pointer' } as any);
  });
});
