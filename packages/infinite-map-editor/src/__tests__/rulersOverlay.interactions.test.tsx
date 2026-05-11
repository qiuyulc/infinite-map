import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { createEventBus, createStore, type Camera, type MapContext } from '@qiuyulc/infinite-map';
import { createEngineStore } from '@qiuyulc/infinite-map';
import { RulersOverlay } from '../plugins/RulersOverlay';

afterEach(() => cleanup());

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

describe('RulersOverlay interactions', () => {
  // FIXME: jsdom does not fully support setPointerCapture, causing pointer events
  // to not propagate correctly during ruler drag. Works in real browsers.
  it.skip('dragging on horizontal ruler pans X; dragging out creates a vertical guide', async () => {
    const store = createStore();
    const bus = createEventBus();
    const engineStore = createEngineStore({ x: 0, y: 0, zoom: 1 });
    engineStore.getState().setViewport({ w: 800, h: 600 });

    const camRef = { current: { x: 0, y: 0, zoom: 1 } as Camera };
    const cameraSvc = {
      set: vi.fn((c: Camera) => {
        camRef.current = c;
        engineStore.getState().setView(c);
      }),
      get: () => camRef.current,
    };

    const ctx: MapContext = {
      store,
      bus,
      services: { engine: { store: engineStore, cameraRef: camRef }, camera: cameraSvc },
      registerService: () => void 0,
      getService: (id: string) => (ctx as any).services[id],
      getCamera: () => camRef.current,
      getViewport: () => ({ w: 800, h: 600 }),
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

    const { container } = render(<RulersOverlay ctx={ctx} thickness={24} />);
    const svgs = container.querySelectorAll('svg');
    const hSvg = svgs[0] as SVGSVGElement;
    expect(hSvg).toBeTruthy();
    // guideRoot overlay uses its own rect
    const overlayRoot = container.firstElementChild?.parentElement ?? container;
    setRect(overlayRoot, { left: 0, top: 0, width: 800, height: 600 });
    setRect(hSvg, { left: 0, top: 0, width: 800, height: 24 });

    // pan: move within ruler area (y < thickness)
    fireEvent.pointerDown(hSvg, { pointerId: 1, button: 0, clientX: 100, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 140, clientY: 10 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 140, clientY: 10 });
    expect(cameraSvc.set).toHaveBeenCalled();
    // dx=40 => cam.x = -40
    expect(camRef.current.x).toBe(-40);

    // guide: drag down into content area
    fireEvent.pointerDown(hSvg, { pointerId: 2, button: 0, clientX: 200, clientY: 10 });
    fireEvent.pointerMove(window, { pointerId: 2, clientX: 200, clientY: 80 });
    fireEvent.pointerUp(window, { pointerId: 2, clientX: 200, clientY: 80 });

    const guides = store.get<any>('rulers:guides');
    expect(guides?.v?.length).toBe(1);
  });
});

