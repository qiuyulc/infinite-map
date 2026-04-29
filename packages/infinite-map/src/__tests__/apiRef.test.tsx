import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useRef, useState } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { InfiniteMap, type InfiniteMapApi, type InfiniteMapPlugin, type NodeData } from '../index';

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

describe('InfiniteMap apiRef', () => {
  it('serializeDoc/parseDoc works and validates onNodesChange requirement', async () => {
    const apiRef = { current: null as InfiniteMapApi | null };
    const dummy: InfiniteMapPlugin = { id: 'dummy' };
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 10, height: 10, label: 'A' }];

    const { container, rerender } = render(<InfiniteMap nodes={nodes} plugins={[dummy]} apiRef={apiRef as any} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 0));

    const doc = apiRef.current!.serializeDoc({ foo: 1 });
    expect(doc).toHaveProperty('nodes');
    expect(doc).toHaveProperty('camera');

    // parseDoc without onNodesChange should throw
    expect(() => apiRef.current!.parseDoc(doc)).toThrow(/onNodesChange is required/);

    // now provide onNodesChange and parse
    const onNodesChange = vi.fn();
    rerender(<InfiniteMap nodes={nodes} plugins={[dummy]} apiRef={apiRef as any} onNodesChange={onNodesChange} />);
    await new Promise((r) => setTimeout(r, 0));

    act(() => {
      apiRef.current!.parseDoc(doc, { immediate: true });
    });
    expect(onNodesChange).toHaveBeenCalled();
  });

  it('setSelectionIds throws when selection service is missing', async () => {
    const apiRef = { current: null as InfiniteMapApi | null };
    const dummy: InfiniteMapPlugin = { id: 'dummy' };
    const { container } = render(<InfiniteMap nodes={[]} plugins={[dummy]} apiRef={apiRef as any} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 0));

    expect(() => apiRef.current!.setSelectionIds(['a'])).toThrow(/selection service is not available/);
  });
});

