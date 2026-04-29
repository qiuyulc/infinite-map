import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { createStore, STORE_KEYS, type MapContext } from '@qiuyulc/infinite-map';
import { MarqueeOverlay } from '../plugins/MarqueeOverlay';

afterEach(() => cleanup());

function makeCtx() {
  const store = createStore();
  const ctx: MapContext = {
    store,
    bus: { on: () => () => void 0, emit: () => void 0 } as any,
    services: {},
    registerService: () => void 0,
    getService: () => undefined,
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } as any),
    getViewport: () => ({ w: 1, h: 1 }),
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
  return ctx;
}

describe('MarqueeOverlay', () => {
  it('renders box when active', () => {
    const ctx = makeCtx();
    ctx.store.set(STORE_KEYS.editEnabled, true);
    ctx.store.set(STORE_KEYS.marqueeState, { active: true, startScreen: { x: 10, y: 20 }, currScreen: { x: 30, y: 10 } });
    const { container } = render(<MarqueeOverlay ctx={ctx} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.left).toBe('10px');
    expect(el.style.top).toBe('10px');
    expect(el.style.width).toBe('20px');
    expect(el.style.height).toBe('10px');
  });
});

