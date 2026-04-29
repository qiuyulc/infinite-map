import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useEffect, useRef } from 'react';
import { cleanup, render } from '@testing-library/react';
import type { Camera } from '../core/types';
import { useWheelControls } from '../hooks/useWheelControls';

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

describe('useWheelControls', () => {
  it('zooms on pinch/mousewheel and pans on trackpad', async () => {
    const commitCamera = vi.fn();
    const api = { current: null as any };

    function Harness() {
      const elRef = useRef<HTMLDivElement | null>(null);
      const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
      useWheelControls({
        containerRef: elRef,
        cameraRef: camRef,
        commitCamera: (next, immediate) => {
          camRef.current = next;
          commitCamera(next, immediate);
        },
        panEnabled: true,
        minZoom: 0.25,
        maxZoom: 2.5,
        zoomSpeed: 0.001,
        pinchZoomFactor: 0.6,
      });
      useEffect(() => {
        api.current = { el: elRef.current!, camRef };
      }, []);
      return <div ref={elRef} />;
    }

    const { container } = render(<Harness />);
    const el = container.firstElementChild as HTMLElement;
    setRect(el, { left: 0, top: 0, width: 800, height: 600 });

    // pinch zoom (ctrlKey=true) -> immediate true
    el.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 100, clientY: 100, deltaY: 120, deltaMode: 0, ctrlKey: true })
    );
    expect(commitCamera).toHaveBeenCalled();
    expect(commitCamera.mock.calls.at(-1)?.[1]).toBe(true);

    // trackpad pan (deltaMode=0, ctrlKey=false) -> immediate false
    el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: 0, clientY: 0, deltaX: 10, deltaY: 20, deltaMode: 0 }));
    expect(commitCamera.mock.calls.at(-1)?.[1]).toBe(false);
  });

  it('does not pan when panEnabled=false', () => {
    const commitCamera = vi.fn();

    function Harness() {
      const elRef = useRef<HTMLDivElement | null>(null);
      const camRef = useRef<Camera>({ x: 0, y: 0, zoom: 1 });
      useWheelControls({
        containerRef: elRef,
        cameraRef: camRef,
        commitCamera,
        panEnabled: false,
        minZoom: 0.25,
        maxZoom: 2.5,
        zoomSpeed: 0.001,
        pinchZoomFactor: 0.6,
      });
      return <div ref={elRef} />;
    }

    const { container } = render(<Harness />);
    const el = container.firstElementChild as HTMLElement;
    setRect(el, { left: 0, top: 0, width: 800, height: 600 });

    el.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 10, deltaY: 20, deltaMode: 0 }));
    expect(commitCamera).not.toHaveBeenCalled();
  });
});

