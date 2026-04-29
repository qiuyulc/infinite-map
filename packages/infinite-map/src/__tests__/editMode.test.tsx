import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { InfiniteMap, type InfiniteMapPlugin, type MapContext, type NodeData } from '../index';

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

describe('InfiniteMap editMode branches', () => {
  it('controlled mode without sinks disables applyPatches', async () => {
    let ctx: MapContext | null = null;
    const capture: InfiniteMapPlugin = { id: 'cap', setup: (c) => void (ctx = c) };

    const { container } = render(<InfiniteMap nodes={[]} plugins={[capture]} editMode="controlled" />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 0));

    // no sinks, so should no-op
    act(() => {
      ctx!.applyPatches([{ type: 'move', id: 'a', x: 1, y: 2 } as any], { source: 'plugin', plugin: 't', reason: 'drag', phase: 'end', ids: ['a'] });
    });
  });

  it('controlled mode with onPatches receives patches', async () => {
    let ctx: MapContext | null = null;
    const capture: InfiniteMapPlugin = { id: 'cap', setup: (c) => void (ctx = c) };
    const onPatches = vi.fn();
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 10, height: 10 }];

    const { container } = render(<InfiniteMap nodes={nodes} plugins={[capture]} editMode="controlled" onPatches={onPatches} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600 });
    await new Promise((r) => setTimeout(r, 0));

    act(() => {
      ctx!.applyPatches([{ type: 'move', id: 'a', x: 2, y: 3 } as any], { source: 'plugin', plugin: 't', reason: 'drag', phase: 'end', ids: ['a'] });
    });
    expect(onPatches).toHaveBeenCalled();
  });
});

