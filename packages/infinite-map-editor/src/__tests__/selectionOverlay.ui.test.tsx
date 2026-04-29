import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { createEventBus, createStore, STORE_KEYS, type MapContext, type NodeData } from '@qiuyulc/infinite-map';
import { SelectionOverlay } from '../plugins/SelectionOverlay';

afterEach(() => cleanup());

function makeCtx(nodes: NodeData[]) {
  const store = createStore();
  const bus = createEventBus();
  const ctx: MapContext = {
    store,
    bus,
    services: {},
    registerService: () => void 0,
    getService: () => undefined,
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } as any),
    getViewport: () => ({ w: 800, h: 600 }),
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
  return ctx;
}

describe('SelectionOverlay (UI)', () => {
  it('renders 8 resize handles + rotate handle for single selection', () => {
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 100, height: 50, rotation: 15, data: {} } as any];
    const ctx = makeCtx(nodes);
    ctx.store.set(STORE_KEYS.editEnabled, true);
    ctx.store.set(STORE_KEYS.selectionIds, ['a']);

    render(<SelectionOverlay ctx={ctx} />);

    expect(document.querySelectorAll('[data-handle]')).toHaveLength(8);
    expect(document.querySelectorAll('[data-rotate-handle="1"][data-nodeid="a"]')).toHaveLength(1);
  });

  it('renders group rotate handle when multi-select', () => {
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 100, height: 50, data: {} } as any,
      { id: 'b', x: 120, y: 0, width: 100, height: 50, data: {} } as any,
    ];
    const ctx = makeCtx(nodes);
    ctx.store.set(STORE_KEYS.editEnabled, true);
    ctx.store.set(STORE_KEYS.selectionIds, ['a', 'b']);

    render(<SelectionOverlay ctx={ctx} />);
    expect(document.querySelectorAll('[data-rotate-handle="1"][data-rotate-scope="group"]')).toHaveLength(1);
    // multi-select 时不渲染单选的 8 个 resize handles
    expect(document.querySelectorAll('[data-handle]')).toHaveLength(0);
  });

  it('returns null when edit is disabled', () => {
    const ctx = makeCtx([{ id: 'a', x: 0, y: 0, width: 10, height: 10, data: {} } as any]);
    ctx.store.set(STORE_KEYS.editEnabled, false);
    ctx.store.set(STORE_KEYS.selectionIds, ['a']);
    const { container } = render(<SelectionOverlay ctx={ctx} />);
    expect(container.firstChild).toBeNull();
  });
});

