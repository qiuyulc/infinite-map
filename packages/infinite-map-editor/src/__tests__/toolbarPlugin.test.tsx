import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createEventBus, createStore, STORE_KEYS, type MapContext } from '@qiuyulc/infinite-map';
import { createToolbarPlugin } from '../plugins/createToolbarPlugin';

afterEach(() => cleanup());

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

  // selection service used by delete button enabled()
  ctx.registerService('selection', { getIds: () => [] });
  return { ctx, store };
}

describe('createToolbarPlugin', () => {
  it('renders default items and dividers', () => {
    const { ctx, store } = makeCtx();
    store.set(STORE_KEYS.historyUndoStack, [1]);
    store.set(STORE_KEYS.historyRedoStack, [1]);

    const plugin = createToolbarPlugin();
    render(<>{plugin.overlay?.({ ctx })}</>);

    // default items: at least undo/redo exist
    expect(screen.getByRole('button', { name: /撤销/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重做/i })).toBeInTheDocument();

    // divider rendered as 1px element; we check count by style width=1
    const dividers = Array.from(document.querySelectorAll('div')).filter((d) => (d as HTMLElement).style.width === '1px');
    expect(dividers.length).toBeGreaterThan(0);
  });

  it('clicking a command calls ctx.runCommand with source=toolbar', () => {
    const { ctx, store } = makeCtx();
    store.set(STORE_KEYS.historyUndoStack, [1]);

    const plugin = createToolbarPlugin();
    render(<>{plugin.overlay?.({ ctx })}</>);

    fireEvent.click(screen.getAllByRole('button', { name: /撤销/i })[0]);
    expect(ctx.runCommand).toHaveBeenCalledWith('history.undo', expect.objectContaining({ source: 'toolbar' }));
  });

  it('shows fixed tooltip on pointer enter and hides on leave', () => {
    const { ctx, store } = makeCtx();
    store.set(STORE_KEYS.historyUndoStack, [1]);

    const plugin = createToolbarPlugin();
    render(<>{plugin.overlay?.({ ctx })}</>);

    const btn = screen.getAllByRole('button', { name: /撤销/i })[0];
    fireEvent.pointerEnter(btn);

    const tip = document.querySelector('.im-toolbar-tooltip') as HTMLElement;
    expect(tip).toBeTruthy();
    expect(tip.getAttribute('data-show')).toBe('1');
    expect(tip.textContent).toContain('撤销');

    fireEvent.pointerLeave(btn);
    expect(tip.getAttribute('data-show')).toBe('0');
  });
});
