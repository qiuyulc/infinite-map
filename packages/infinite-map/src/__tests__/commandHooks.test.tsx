import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useEffect, useMemo, useRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { createStore } from '../editor/runtime';
import type { Command, MapContext } from '../editor/types';
import { useCommandRegistry } from '../hooks/useCommandRegistry';
import { useRunCommandWithHooks } from '../hooks/useRunCommandWithHooks';

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

describe('useCommandRegistry', () => {
  it('keeps first command by default and can override', async () => {
    const store = createStore();
    const cmd1: Command = { id: 'x', title: 'x', run: vi.fn() };
    const cmd2: Command = { id: 'x', title: 'x2', run: vi.fn() };
    const p1 = { id: 'p1', commands: { x: cmd1 } };
    const p2 = { id: 'p2', commands: { x: cmd2 } };

    function Harness({ policy }: { policy: 'keep-first' | 'override' }) {
      const plugins = useMemo(() => [p1 as any, p2 as any], []);
      useCommandRegistry({ plugins, store, commandConflictPolicy: policy, warnOnCommandConflict: false });
      return null;
    }

    const { rerender } = render(<Harness policy="keep-first" />);
    await act(async () => void 0);
    expect((store.get('commands:from') as any).x).toBe('p1');

    rerender(<Harness policy="override" />);
    await act(async () => void 0);
    expect((store.get('commands:from') as any).x).toBe('p2');
  });

  it('throws when policy=error', () => {
    const store = createStore();
    const cmd1: Command = { id: 'x', title: 'x', run: vi.fn() };
    const cmd2: Command = { id: 'x', title: 'x2', run: vi.fn() };
    const p1 = { id: 'p1', commands: { x: cmd1 } };
    const p2 = { id: 'p2', commands: { x: cmd2 } };

    function Harness() {
      useCommandRegistry({ plugins: [p1 as any, p2 as any], store, commandConflictPolicy: 'error', warnOnCommandConflict: false });
      return null;
    }
    expect(() => render(<Harness />)).toThrow();
  });
});

describe('useRunCommandWithHooks', () => {
  it('intercept mode can block command, missing command returns false, errors are reported', async () => {
    const ctx = makeCtx();
    const ctxRef = { current: ctx };
    const onEditorError = vi.fn();

    const ran: string[] = [];
    const okCmd: Command = { id: 'ok', title: 'ok', run: () => ran.push('ok') };
    const throwCmd: Command = { id: 'throw', title: 'throw', run: () => void (() => { throw new Error('boom'); })() };
    ctx.store.set('commands:registry', { ok: okCmd, throw: throwCmd });
    ctx.store.set('commands:from', { throw: 'p.throw' });

    const before = vi.fn(() => false);
    const after = vi.fn();

    const hooksRef = { current: { onBeforeCommand: before, onAfterCommand: after } };
    const hookModeRef = { current: 'intercept' as const };
    const onEditorErrorRef = { current: (err: unknown) => onEditorError(err) } as any;

    let run: any = null;
    function Harness() {
      const fn = useRunCommandWithHooks({ ctxRef: ctxRef as any, hooksRef: hooksRef as any, hookModeRef: hookModeRef as any, onEditorErrorRef });
      useEffect(() => {
        run = fn;
      }, [fn]);
      return null;
    }
    render(<Harness />);

    // blocked
    expect(run('ok', { source: 'api' })).toBe(false);
    expect(ran).toEqual([]);

    // allow then run ok
    before.mockImplementation(() => true);
    expect(run('ok', { source: 'api' })).toBe(true);
    expect(ran).toEqual(['ok']);

    // missing
    expect(run('missing', { source: 'api' })).toBe(false);

    // throws => reported and returns false
    expect(run('throw', { source: 'api' })).toBe(false);
    expect(onEditorError).toHaveBeenCalled();
  });
});

