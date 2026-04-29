import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useEffect, useRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import type { ChangeMeta, NodeData, NodePatch } from '../index';
import { usePatchEngine } from '../hooks/usePatchEngine';

afterEach(() => cleanup());

function Harness(props: {
  initialNodes: NodeData[];
  hookMode?: 'observe' | 'intercept';
  onBefore?: (patches: NodePatch[], meta: ChangeMeta) => NodePatch[] | void;
  onAfter?: (patches: NodePatch[], meta: ChangeMeta) => void;
  onEditorError?: (err: unknown) => void;
  onNodesChange?: (nodes: NodeData[]) => void;
  onPatches?: (patches: NodePatch[]) => void;
  expose: (api: { apply: (p: NodePatch[], m: ChangeMeta) => void; flush: () => void; nodesRef: React.MutableRefObject<NodeData[]> }) => void;
}) {
  const nodesRef = useRef<NodeData[]>(props.initialNodes);
  const onNodesChangeRef = useRef<any>();
  const onPatchesRef = useRef<any>();
  const hooksRef = useRef<any>({ onBeforeApplyPatches: props.onBefore, onAfterApplyPatches: props.onAfter });
  const hookModeRef = useRef<'observe' | 'intercept'>(props.hookMode ?? 'observe');
  const onEditorErrorRef = useRef<any>((err: unknown) => props.onEditorError?.(err));
  const bus = useRef({ emit: vi.fn() }).current;

  onNodesChangeRef.current = (nodes: NodeData[]) => props.onNodesChange?.(nodes);
  onPatchesRef.current = (patches: NodePatch[]) => props.onPatches?.(patches);
  hooksRef.current = { onBeforeApplyPatches: props.onBefore, onAfterApplyPatches: props.onAfter };
  hookModeRef.current = props.hookMode ?? 'observe';

  const { applyPatches, flushPendingMovePatches } = usePatchEngine({
    bus,
    nodesRef,
    onNodesChangeRef,
    onPatchesRef,
    hooksRef,
    hookModeRef,
    onEditorErrorRef,
  } as any);

  useEffect(() => {
    props.expose({ apply: applyPatches, flush: flushPendingMovePatches, nodesRef });
  }, [applyPatches, flushPendingMovePatches, props]);

  return null;
}

describe('usePatchEngine', () => {
  it('intercept mode uses onBeforeApplyPatches returned patches', async () => {
    const api = { current: null as any };
    render(
      <Harness
        initialNodes={[{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]}
        hookMode="intercept"
        onBefore={() => [{ type: 'move', id: 'a', x: 7, y: 8 }]}
        expose={(x) => (api.current = x)}
      />
    );

    await act(async () => {
      api.current.apply([{ type: 'move', id: 'a', x: 1, y: 2 }], { source: 'plugin', plugin: 't', reason: 'drag', phase: 'end', ids: ['a'] });
    });

    expect(api.current.nodesRef.current.find((n: any) => n.id === 'a')).toMatchObject({ x: 7, y: 8 });
  });

  it('move-phase patches are merged and flushed on next non-move', async () => {
    const rafQueue: FrameRequestCallback[] = [];
    const oldRaf = globalThis.requestAnimationFrame;
    const oldCancel = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return 1 as any;
    }) as any;
    globalThis.cancelAnimationFrame = (() => void 0) as any;

    const onNodesChange = vi.fn();
    const onPatches = vi.fn();
    const api = { current: null as any };
    render(
      <Harness
        initialNodes={[{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]}
        onNodesChange={onNodesChange}
        onPatches={onPatches}
        expose={(x) => (api.current = x)}
      />
    );

    await act(async () => {
      api.current.apply([{ type: 'move', id: 'a', x: 1, y: 2 }], { source: 'plugin', plugin: 't', reason: 'drag', phase: 'move', ids: ['a'] });
      api.current.apply([{ type: 'move', id: 'a', x: 9, y: 9 }], { source: 'plugin', plugin: 't', reason: 'drag', phase: 'move', ids: ['a'] });
      // flush by applying an end patch
      api.current.apply([{ type: 'set', id: 'a', data: { width: 11 } }], { source: 'plugin', plugin: 't', reason: 'drag', phase: 'end', ids: ['a'] });
    });

    // queued RAF should be cancelled/cleared by flush on end
    expect(onNodesChange).toHaveBeenCalled();
    expect(onPatches).toHaveBeenCalled();

    globalThis.requestAnimationFrame = oldRaf;
    globalThis.cancelAnimationFrame = oldCancel;
  });

  it('reports hook errors for onAfterApplyPatches', async () => {
    const onEditorError = vi.fn();
    const api = { current: null as any };
    render(
      <Harness
        initialNodes={[{ id: 'a', x: 0, y: 0, width: 10, height: 10 }]}
        onAfter={() => {
          throw new Error('after boom');
        }}
        onEditorError={onEditorError}
        expose={(x) => (api.current = x)}
      />
    );
    await act(async () => {
      api.current.apply([{ type: 'move', id: 'a', x: 1, y: 2 }], { source: 'plugin', plugin: 't', reason: 'drag', phase: 'end', ids: ['a'] });
    });
    expect(onEditorError).toHaveBeenCalled();
  });
});

