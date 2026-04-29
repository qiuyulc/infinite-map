import { describe, expect, it, vi } from 'vitest';
import type { MapContext } from '@qiuyulc/infinite-map';
import { createEventBus, createStore } from '@qiuyulc/infinite-map';
import { createShortcutsPlugin } from '../plugins/createShortcutsPlugin';

function makeCtx() {
  const store = createStore();
  const bus = createEventBus();
  const ctx: MapContext = {
    store,
    bus,
    services: {},
    registerService: () => {},
    getService: () => undefined,
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
  return ctx;
}

describe('createShortcutsPlugin', () => {
  it('runs command for matched key', () => {
    const ctx = makeCtx();
    const plugin = createShortcutsPlugin({ keymap: { 'Mod+K': { commandId: 'x.test' } } });
    const r = plugin.input?.onKeyDown?.(
      {
        key: 'k',
        modifiers: { shift: false, alt: false, ctrl: true, meta: false },
        originalEvent: { target: document.body },
      } as any,
      ctx
    );
    expect(r?.handled).toBe(true);
    expect(ctx.runCommand).toHaveBeenCalledWith('x.test', expect.objectContaining({ source: 'keyboard' }));
  });

  it('does not intercept when target is input/contenteditable', () => {
    const ctx = makeCtx();
    const plugin = createShortcutsPlugin();
    const input = document.createElement('input');
    const r = plugin.input?.onKeyDown?.(
      {
        key: 'z',
        modifiers: { shift: false, alt: false, ctrl: true, meta: false },
        originalEvent: { target: input },
      } as any,
      ctx
    );
    expect(r?.handled).toBe(false);
  });
});

