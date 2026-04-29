import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useEffect, useRef } from 'react';
import { cleanup, render } from '@testing-library/react';
import type { Camera } from '../core/types';
import type { InfiniteMapPlugin, MapContext } from '../editor/types';
import { createEventBus, createStore } from '../editor/runtime';
import { useMapRuntimeEffects } from '../hooks/useMapRuntimeEffects';

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

describe('useMapRuntimeEffects', () => {
  it('allows plugins to intercept wheel and listens camera:set', () => {
    const bus = createEventBus();
    const store = createStore();
    const containerRef = { current: null as HTMLElement | null };
    const cameraRef = { current: { x: 0, y: 0, zoom: 1 } as Camera };
    const commitCamera = vi.fn((next: Camera) => {
      cameraRef.current = next;
    });

    const plugin: InfiniteMapPlugin = {
      id: 'test.wheel',
      input: {
        onWheel: () => ({ handled: true }), // stop by default
      },
    };

    const ctx: MapContext = {
      getCamera: () => cameraRef.current,
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
      bus,
      store,
      services: {},
      registerService: () => void 0,
      getService: () => undefined,
    } as any;

    function Harness() {
      const elRef = useRef<HTMLDivElement | null>(null);
      useEffect(() => {
        containerRef.current = elRef.current;
      }, []);
      useMapRuntimeEffects({
        plugins: [plugin],
        ctx,
        containerRef,
        cameraRef,
        commitCamera,
        panEnabled: true,
        minZoom: 0.25,
        maxZoom: 2.5,
        zoomSpeed: 0.001,
        pinchZoomFactor: 0.6,
        screenToWorld: (p) => p,
        bus: bus as any,
      });
      return <div ref={elRef} />;
    }

    const { container } = render(<Harness />);
    const el = container.firstElementChild as HTMLElement;
    setRect(el, { left: 0, top: 0, width: 800, height: 600 });

    // wheel should be intercepted => commitCamera not called
    el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120, deltaMode: 1, clientX: 10, clientY: 10 }));
    expect(commitCamera).not.toHaveBeenCalled();

    // camera:set should update camera via commitCamera
    bus.emit('camera:set', { camera: { x: 3, y: 4, zoom: 2 }, immediate: true } as any);
    expect(commitCamera).toHaveBeenCalled();
    expect(cameraRef.current.zoom).toBe(2);
  });
});

