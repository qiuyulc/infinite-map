import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEventBus, createStore, STORE_KEYS, type MapContext } from '@qiuyulc/infinite-map';
import { createDefaultContextMenuPlugin } from '../plugins/createDefaultContextMenuPlugin';

function makeCtx() {
  const store = createStore();
  const bus = createEventBus();
  const services: Record<string, unknown> = {};
  const ctx: MapContext = {
    store,
    bus,
    services,
    registerService: (name: string, s: unknown) => {
      services[name] = s;
    },
    getService: (name: string) => services[name] as any,
    // unused in these tests
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } as any),
    getViewport: () => ({ w: 800, h: 600 }),
    getNodes: () => [],
    getVisibleNodes: () => [],
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    queryNodesInWorldRect: () => [],
    applyPatches: () => {},
    requestRender: () => {},
    runCommand: vi.fn(),
  } as any;
  return { ctx, store };
}

describe('createDefaultContextMenuPlugin', () => {
  it('opens menu when contextMenuState is set and runs command on click', async () => {
    const { ctx, store } = makeCtx();
    store.set(STORE_KEYS.editEnabled, true);

    const plugin = createDefaultContextMenuPlugin();
    render(<>{plugin.overlay?.({ ctx })}</>);

    // open menu
    act(() => {
      store.set(STORE_KEYS.contextMenuState, {
        screen: { x: 10, y: 10 },
        world: { x: 1, y: 2 },
        selectionIds: ['n1'],
        hitNodeId: 'n1',
      });
    });

    // default items include "复制"
    await waitFor(() => expect(screen.getByRole('button', { name: /复制/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /复制/i }));
    expect(ctx.runCommand).toHaveBeenCalledWith('edit.copy', expect.objectContaining({ source: 'menu' }));
    expect(store.get(STORE_KEYS.contextMenuState)).toBeNull();
  });

  it('closes menu when contextMenuState becomes null', async () => {
    const { ctx, store } = makeCtx();
    store.set(STORE_KEYS.editEnabled, true);

    const plugin = createDefaultContextMenuPlugin();
    render(<>{plugin.overlay?.({ ctx })}</>);

    act(() => {
      store.set(STORE_KEYS.contextMenuState, {
        screen: { x: 10, y: 10 },
        world: { x: 1, y: 2 },
        selectionIds: ['n1'],
        hitNodeId: 'n1',
      });
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /复制/i })).toBeInTheDocument());

    act(() => {
      store.set(STORE_KEYS.contextMenuState, null);
    });

    await waitFor(() => expect(screen.queryByRole('button', { name: /复制/i })).not.toBeInTheDocument());
  });
});

