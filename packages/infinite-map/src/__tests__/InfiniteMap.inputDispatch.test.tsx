import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { InfiniteMap, STORE_KEYS, type HitTestTarget, type InfiniteMapApi, type InfiniteMapPlugin, type MapContext, type NodeData } from '../index';

function setRect(el: Element, rect: Partial<DOMRect>) {
  (el as any).getBoundingClientRect = () =>
    ({
      x: rect.x ?? 0,
      y: rect.y ?? 0,
      left: rect.left ?? rect.x ?? 0,
      top: rect.top ?? rect.y ?? 0,
      right: (rect.left ?? rect.x ?? 0) + (rect.width ?? 0),
      bottom: (rect.top ?? rect.y ?? 0) + (rect.height ?? 0),
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function createCapturePlugin(onCtx: (ctx: MapContext) => void): InfiniteMapPlugin {
  return { id: 'test.capture', setup: (ctx) => onCtx(ctx) };
}

function createHitTestPlugin(): InfiniteMapPlugin {
  return {
    id: 'test.hittest',
    hitTests: [
      {
        id: 'test.hittest.nodes',
        priority: 10,
        hitTest: (e, ctx) => {
          const p = (e as any).world as { x: number; y: number };
          for (const n of ctx.getNodes()) {
            if (p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height) {
              return { kind: 'node', id: n.id, cursor: 'pointer' } satisfies HitTestTarget;
            }
          }
          return { kind: 'blank', cursor: 'crosshair' } satisfies HitTestTarget;
        },
      },
    ],
    inputHooks: {
      onHoverChange: ({ next }, ctx) => {
        // 触发一次 store 写入，覆盖 hook 调用链
        ctx.store.set('test:lastHoverKind', next.kind);
      },
    },
  };
}

function createGesturePlugin(calls: { start: number; move: number; end: number }): InfiniteMapPlugin {
  return {
    id: 'test.gesture',
    gestures: [
      {
        id: 'test.gesture.node',
        priority: 999,
        canStart: (_e, _ctx, hit) => hit.kind === 'node',
        onStart: (_e, ctx, hit) => {
          calls.start++;
          ctx.store.set('test:active', (hit as any).id ?? 'unknown');
        },
        onMove: () => {
          calls.move++;
        },
        onEnd: () => {
          calls.end++;
        },
        onCancel: () => {
          calls.end++;
        },
      },
    ],
  };
}

describe('InfiniteMap input dispatch (core)', () => {
  afterEach(() => cleanup());

  it('hover updates cursor and STORE_KEYS.hoverHit via hitTest pipeline', async () => {
    let ctxRef: MapContext | null = null;
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' }];
    const plugins = [createHitTestPlugin(), createCapturePlugin((c) => (ctxRef = c))];
    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });

    // wait effects
    await new Promise((r) => setTimeout(r, 20));

    // move to node area: camera center at (0,0), viewport 800x600, node at world(0,0,80,40) -> screen(400,300,480,340)
    fireEvent.pointerMove(root, { pointerId: 1, clientX: 420, clientY: 310 });

    await waitFor(() => {
      expect(ctxRef).toBeTruthy();
      expect(ctxRef!.store.get(STORE_KEYS.hoverHit)?.kind).toBe('node');
      expect(ctxRef!.store.get('test:lastHoverKind')).toBe('node');
      expect(root.style.cursor).toBe('pointer');
    });
  });

  it('starts custom gesture on node and dispatches move/end', async () => {
    const calls = { start: 0, move: 0, end: 0 };
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' }];
    const plugins = [createHitTestPlugin(), createGesturePlugin(calls)];
    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });
    await new Promise((r) => setTimeout(r, 20));

    fireEvent.pointerDown(root, { pointerId: 1, button: 0, buttons: 1, clientX: 420, clientY: 310 });
    fireEvent.pointerMove(root, { pointerId: 1, buttons: 1, clientX: 440, clientY: 330 });
    fireEvent.pointerUp(root, { pointerId: 1, button: 0, buttons: 0, clientX: 440, clientY: 330 });

    expect(calls.start).toBe(1);
    expect(calls.move).toBeGreaterThan(0);
    expect(calls.end).toBe(1);
  });

  it('pan gesture updates camera when dragging blank area', async () => {
    const apiRef = { current: null as InfiniteMapApi | null };
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' }];
    const plugins = [createHitTestPlugin()];
    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} apiRef={apiRef as any} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });
    await new Promise((r) => setTimeout(r, 20));

    const before = apiRef.current!.getCamera();
    // click blank (far away from node): use world(1000,1000) -> screen(1400,1250)
    fireEvent.pointerDown(root, { pointerId: 1, button: 0, buttons: 1, clientX: 1400, clientY: 1250 });
    fireEvent.pointerMove(root, { pointerId: 1, buttons: 1, clientX: 1500, clientY: 1250 });
    fireEvent.pointerUp(root, { pointerId: 1, button: 0, buttons: 0, clientX: 1500, clientY: 1250 });

    await waitFor(() => {
      const after = apiRef.current!.getCamera();
      expect(after.x).not.toBe(before.x);
    });
  });

  it('dispatches keydown only when canvas is focused', async () => {
    const onKeyDown = vi.fn(() => ({ handled: true } as const));
    const plugin: InfiniteMapPlugin = { id: 'test.key', input: { onKeyDown } };
    const plugins = [plugin];
    const { container } = render(<InfiniteMap nodes={[]} plugins={plugins} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });
    await new Promise((r) => setTimeout(r, 20));

    // not focused => ignored
    fireEvent.keyDown(document.body, { key: 'x', code: 'KeyX' });
    expect(onKeyDown).not.toHaveBeenCalled();

    // focus and then keydown
    root.focus();
    fireEvent.keyDown(root, { key: 'x', code: 'KeyX' });
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('context menu dispatch calls plugin onContextMenu and can be intercepted', async () => {
    const onContextMenu = vi.fn(() => ({ handled: true } as const));
    const plugin: InfiniteMapPlugin = {
      id: 'test.ctxmenu',
      hitTests: [
        {
          id: 'test.ctxmenu.hit',
          hitTest: () => ({ kind: 'blank' } as HitTestTarget),
        },
      ],
      input: { onContextMenu },
    };
    const { container } = render(<InfiniteMap nodes={[]} plugins={[plugin]} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });
    await new Promise((r) => setTimeout(r, 20));

    fireEvent.contextMenu(root, { clientX: 20, clientY: 30 });
    expect(onContextMenu).toHaveBeenCalled();
  });

  it('pointerDownProcessor can block gestures (stop=true)', async () => {
    const calls = { start: 0, move: 0, end: 0 };
    const blocker: InfiniteMapPlugin = {
      id: 'test.blocker',
      pointerDownProcessors: [
        {
          id: 'test.blocker.proc',
          priority: 1000,
          onPointerDown: () => ({ stop: true } as any),
        },
      ],
    };
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' }];
    const plugins = [createHitTestPlugin(), blocker, createGesturePlugin(calls)];
    const { container } = render(<InfiniteMap nodes={nodes} plugins={plugins} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });
    await new Promise((r) => setTimeout(r, 20));

    fireEvent.pointerDown(root, { pointerId: 1, button: 0, buttons: 1, clientX: 410, clientY: 260 });
    fireEvent.pointerUp(root, { pointerId: 1, button: 0, buttons: 0, clientX: 410, clientY: 260 });

    expect(calls.start).toBe(0);
  });

  it('reports hitTest and gesture errors via onEditorError', async () => {
    const onEditorError = vi.fn();
    const badHit: InfiniteMapPlugin = {
      id: 'test.badHit',
      hitTests: [
        {
          id: 'bad',
          priority: 9999,
          hitTest: () => {
            throw new Error('hit boom');
          },
        },
      ],
    };
    const badGesture: InfiniteMapPlugin = {
      id: 'test.badGesture',
      gestures: [
        {
          id: 'badGesture',
          priority: 9999,
          canStart: () => {
            throw new Error('canStart boom');
          },
          onStart: () => void 0,
          onMove: () => void 0,
          onEnd: () => void 0,
          onCancel: () => void 0,
        },
      ],
    };

    const { container } = render(<InfiniteMap nodes={[]} plugins={[badHit, badGesture]} onNodesChange={() => void 0} onEditorError={onEditorError} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });
    await new Promise((r) => setTimeout(r, 20));

    // trigger hitTest via hover move + trigger canStart on down
    fireEvent.pointerMove(root, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerDown(root, { pointerId: 1, button: 0, buttons: 1, clientX: 10, clientY: 10 });

    await waitFor(() => {
      expect(onEditorError).toHaveBeenCalled();
    });
  });

  it('keydown handled prevents default when in root', async () => {
    const onKeyDown = vi.fn(() => ({ handled: true } as const));
    const plugin: InfiniteMapPlugin = { id: 'test.key2', input: { onKeyDown } };
    const { container } = render(<InfiniteMap nodes={[]} plugins={[plugin]} onNodesChange={() => void 0} />);
    const root = container.firstElementChild as HTMLElement;
    setRect(root, { width: 800, height: 600, left: 0, top: 0 });
    await new Promise((r) => setTimeout(r, 20));

    root.focus();
    const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'x', code: 'KeyX' });
    root.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});
