import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { InfiniteMap, type Camera, type InfiniteMapApi, type NodeData } from '../index';

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

describe('InfiniteMap lifecycle callbacks', () => {
  it('onReady fires once when viewport becomes valid', async () => {
    const onReady = vi.fn();
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, label: 'A' }];

    const { container } = render(<InfiniteMap nodes={nodes} onReady={onReady} />);
    const root = container.firstElementChild as HTMLElement;
    expect(onReady).not.toHaveBeenCalled();
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 50));
    expect(onReady).toHaveBeenCalledTimes(1);
    const api = onReady.mock.calls[0][0];
    expect(api).toHaveProperty('getCamera');
    expect(api).toHaveProperty('moveOriginToTopLeft');
    expect(api).toHaveProperty('getContainerTopLeft');
  });

  it('onCameraChange fires when camera changes', async () => {
    const onCameraChange = vi.fn();
    const apiRef = { current: null as InfiniteMapApi | null };
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, label: 'A' }];

    const { container } = render(
      <InfiniteMap nodes={nodes} onCameraChange={onCameraChange} apiRef={apiRef as any} />
    );
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 50));

    // 直接用 apiRef 设置相机（无插件也能用）
    expect(apiRef.current).not.toBeNull();
    act(() => { apiRef.current!.setCamera({ x: 100, y: 200, zoom: 1.5 }); });
    await new Promise((r) => setTimeout(r, 50));

    expect(onCameraChange).toHaveBeenCalled();
    const last = onCameraChange.mock.calls.at(-1)![0] as Camera;
    expect(last.x).toBe(100);
    expect(last.y).toBe(200);
    expect(last.zoom).toBe(1.5);
  });

  it('onViewportResize fires when viewport changes', async () => {
    const onViewportResize = vi.fn();
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, label: 'A' }];

    const { container } = render(<InfiniteMap nodes={nodes} onViewportResize={onViewportResize} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 50));
    expect(onViewportResize).toHaveBeenCalledWith({ w: 800, h: 600 });
  });

  it('onDestroy fires when component unmounts', async () => {
    const onDestroy = vi.fn();
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, label: 'A' }];

    const { container, unmount } = render(<InfiniteMap nodes={nodes} onDestroy={onDestroy} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 50));
    expect(onDestroy).not.toHaveBeenCalled();
    unmount();
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });

  it('moveOriginToTopLeft moves camera so world(0,0) is at container top-left', async () => {
    const onReady = vi.fn();
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, label: 'A' }];

    const { container } = render(
      <InfiniteMap nodes={nodes} onReady={onReady} initialCamera={{ x: 0, y: 0, zoom: 1 }} />
    );
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 50));

    const api = onReady.mock.calls[0][0];
    api.moveOriginToTopLeft();
    const tl = api.getContainerTopLeft();
    expect(tl.x).toBeCloseTo(0, 5);
    expect(tl.y).toBeCloseTo(0, 5);
  });

  it('apiRef works without plugins (camera methods available)', async () => {
    const apiRef = { current: null as InfiniteMapApi | null };
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, label: 'A' }];

    const { container } = render(<InfiniteMap nodes={nodes} apiRef={apiRef as any} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 50));

    expect(apiRef.current).not.toBeNull();
    expect(apiRef.current!.getCamera()).toBeTruthy();
    expect(apiRef.current!.getContainerTopLeft()).toBeTruthy();
    expect(() => apiRef.current!.moveOriginToTopLeft()).not.toThrow();
  });

  it('origin="top-left" positions world(0,0) at container top-left', async () => {
    const onReady = vi.fn();
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 100, label: 'A' }];

    const { container } = render(
      <InfiniteMap nodes={nodes} onReady={onReady} origin="top-left" initialCamera={{ x: 0, y: 0, zoom: 1 }} />
    );
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 50));

    const api = onReady.mock.calls[0][0];
    const cam = api.getCamera();
    // camera 应被自动设置为左上角模式：x=400, y=300 (800/2, 600/2)
    expect(cam.x).toBeCloseTo(400, 1);
    expect(cam.y).toBeCloseTo(300, 1);
  });
});
