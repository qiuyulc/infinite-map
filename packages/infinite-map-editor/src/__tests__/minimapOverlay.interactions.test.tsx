import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createEventBus, createStore, STORE_KEYS, type Camera, type MapContext, type NodeData } from '@qiuyulc/infinite-map';
import { MinimapOverlay } from '../plugins/MinimapOverlay';

afterEach(() => cleanup());

function mockCanvas2d() {
  const g: any = {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createRadialGradient: () => ({ addColorStop: vi.fn() }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => g);
  return g;
}

function setRect(el: Element, rect: Partial<DOMRect>) {
  (el as any).getBoundingClientRect = () =>
    ({
      left: rect.left ?? 0,
      top: rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      right: (rect.left ?? 0) + (rect.width ?? 0),
      bottom: (rect.top ?? 0) + (rect.height ?? 0),
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function makeEngineStore() {
  let state: any = {
    view: { x: 0, y: 0, zoom: 1 },
    viewport: { w: 100, h: 100 },
  };
  const subs: any[] = [];
  return {
    getState: () => state,
    setState: (next: any) => {
      state = { ...state, ...next };
      subs.forEach((fn) => fn());
    },
    subscribe: (_sel: any, cb: any) => {
      subs.push(cb);
      return () => void 0;
    },
  };
}

describe('MinimapOverlay interactions', () => {
  it('dragging viewport box commits camera via camera service', async () => {
    mockCanvas2d();

    const store = createStore();
    const bus = createEventBus();
    const engineStore = makeEngineStore();
    const camRef = { current: { x: 0, y: 0, zoom: 1 } as Camera };
    const cameraSvc = { set: vi.fn((c: Camera) => (camRef.current = c)) };

    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, data: {} } as any];
    const ctx: MapContext = {
      store,
      bus,
      services: { engine: { store: engineStore, cameraRef: camRef }, camera: cameraSvc },
      registerService: () => void 0,
      getService: (id: string) => (ctx as any).services[id],
      getCamera: () => camRef.current,
      getViewport: () => ({ w: 100, h: 100 }),
      getNodes: () => nodes,
      getVisibleNodes: () => nodes,
      queryNodesInWorldRect: () => [],
      screenToWorld: (p) => p,
      worldToScreen: (p) => p,
      rectScreenToWorld: (r) => r,
      rectWorldToScreen: (r) => r,
      applyPatches: () => {},
      requestRender: () => {},
    } as any;

    const { container } = render(<MinimapOverlay ctx={ctx} opts={{ showStats: true }} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    setRect(canvas, { left: 0, top: 0, width: 260, height: 160 });

    // inside viewport box -> start drag
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 110, clientY: 60 });
    fireEvent.pointerMove(window, { clientX: 120, clientY: 60 });
    fireEvent.pointerUp(window, {});

    expect(cameraSvc.set).toHaveBeenCalled();
    // dragging right should increase cam.x
    expect(camRef.current.x).toBeGreaterThan(0);
    // stats path should write in-view count
    expect(store.get(STORE_KEYS.minimapInViewCount)).toBeTypeOf('number');
  });

  it('clicking outside viewport jumps camera', () => {
    mockCanvas2d();

    const store = createStore();
    const bus = createEventBus();
    const engineStore = makeEngineStore();
    const camRef = { current: { x: 0, y: 0, zoom: 1 } as Camera };
    const cameraSvc = { set: vi.fn((c: Camera) => (camRef.current = c)) };

    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, data: {} } as any];
    const ctx: MapContext = {
      store,
      bus,
      services: { engine: { store: engineStore, cameraRef: camRef }, camera: cameraSvc },
      registerService: () => void 0,
      getService: (id: string) => (ctx as any).services[id],
      getCamera: () => camRef.current,
      getViewport: () => ({ w: 100, h: 100 }),
      getNodes: () => nodes,
      getVisibleNodes: () => nodes,
      queryNodesInWorldRect: () => [],
      screenToWorld: (p) => p,
      worldToScreen: (p) => p,
      rectScreenToWorld: (r) => r,
      rectWorldToScreen: (r) => r,
      applyPatches: () => {},
      requestRender: () => {},
    } as any;

    const { container } = render(<MinimapOverlay ctx={ctx} opts={{ showStats: false }} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    setRect(canvas, { left: 0, top: 0, width: 260, height: 160 });

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 5, clientY: 5 });
    expect(cameraSvc.set).toHaveBeenCalled();
  });

  it('falls back to bus.emit when camera service is missing (and handles empty nodes)', async () => {
    mockCanvas2d();

    const store = createStore();
    const bus = createEventBus();
    const emit = vi.spyOn(bus, 'emit');
    const engineStore = makeEngineStore();
    const camRef = { current: { x: 0, y: 0, zoom: 1 } as Camera };

    const ctx: MapContext = {
      store,
      bus,
      services: { engine: { store: engineStore, cameraRef: camRef } },
      registerService: () => void 0,
      getService: (id: string) => (ctx as any).services[id],
      getCamera: () => camRef.current,
      getViewport: () => ({ w: 100, h: 100 }),
      getNodes: () => [], // empty nodes branch
      getVisibleNodes: () => [],
      queryNodesInWorldRect: () => [],
      screenToWorld: (p) => p,
      worldToScreen: (p) => p,
      rectScreenToWorld: (r) => r,
      rectWorldToScreen: (r) => r,
      applyPatches: () => {},
      requestRender: () => {},
    } as any;

    const { container } = render(<MinimapOverlay ctx={ctx} opts={{ showStats: false }} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    setRect(canvas, { left: 0, top: 0, width: 260, height: 160 });

    // flush mount effects (runStaticNow)
    await new Promise((r) => setTimeout(r, 0));

    // no nodes => handler early return, but effects still ran and built transform defaults
    // we also directly exercise commitCamera fallback by emitting a pointerdown with fake nodes:
    (ctx as any).getNodes = () => [{ id: 'a', x: 0, y: 0, width: 10, height: 10, data: {} }]; // after mount
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 5, clientY: 5 });
    expect(emit).toHaveBeenCalledWith('camera:set', expect.anything());
  });
});
