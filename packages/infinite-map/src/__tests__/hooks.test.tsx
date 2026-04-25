import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useMemo, useRef, useState } from 'react';
import { render, act, cleanup } from '@testing-library/react';
import type { ChangeMeta, InfiniteMapApi, InfiniteMapPlugin, NodeData, NodePatch } from '../index';
import { InfiniteMap } from '../components/InfiniteMap';

function makeNode(): NodeData {
  return { id: 'a', x: 0, y: 0, width: 10, height: 10 };
}

function makeMoveCmdPlugin(): InfiniteMapPlugin {
  return {
    id: 'test-move',
    requires: ['commands'],
    commands: {
      'test.move': {
        id: 'test.move',
        title: 'move',
        run: (ctx) => {
          const patches: NodePatch[] = [{ type: 'move', id: 'a', x: 5, y: 6 }];
          const meta: ChangeMeta = { source: 'plugin', plugin: 'test', reason: 'keyboard', phase: 'end', ids: ['a'] };
          ctx.applyPatches(patches, meta);
        },
      },
    },
  };
}

function makeThrowCmdPlugin(): InfiniteMapPlugin {
  return {
    id: 'test-throw',
    requires: ['commands'],
    commands: {
      'test.throw': {
        id: 'test.throw',
        title: 'throw',
        run: () => {
          throw new Error('boom');
        },
      },
    },
  };
}

function Harness(props: {
  plugins: InfiniteMapPlugin[];
  hookMode?: 'observe' | 'intercept';
  editorHooks?: any;
  onEditorError?: any;
  onNodesChange?: any;
}) {
  const [nodes, setNodes] = useState<NodeData[]>([makeNode()]);
  const apiRef = useRef<InfiniteMapApi | null>(null);
  const plugins = useMemo(() => props.plugins, [props.plugins]);

  return (
    <div>
      <InfiniteMap
        nodes={nodes}
        plugins={plugins}
        apiRef={apiRef as any}
        hookMode={props.hookMode}
        editorHooks={props.editorHooks}
        onEditorError={props.onEditorError}
        onNodesChange={(next, meta) => {
          props.onNodesChange?.(next, meta);
          setNodes(next);
        }}
      />
      <button
        onClick={() => {
          apiRef.current?.runCommand('test.move', { source: 'api' });
        }}
      >
        move
      </button>
      <button
        onClick={() => {
          apiRef.current?.runCommand('test.throw', { source: 'api' });
        }}
      >
        throw
      </button>
    </div>
  );
}

describe('InfiniteMap hooks (state/command)', () => {
  afterEach(() => cleanup());

  it('observe mode ignores onBeforeApplyPatches return value', async () => {
    const onNodesChange = vi.fn();

    const { getByText } = render(
      <Harness
        plugins={[makeMoveCmdPlugin()]}
        editorHooks={{
          onBeforeApplyPatches: () => [],
        }}
        onNodesChange={onNodesChange}
      />
    );

    await act(async () => {
      getByText('move').click();
    });

    const nextNodes = onNodesChange.mock.calls.slice(-1)[0]?.[0] as NodeData[];
    expect(nextNodes[0]).toMatchObject({ id: 'a', x: 5, y: 6 });
  });

  it('reports hook error and continues applying patches', async () => {
    const onNodesChange = vi.fn();
    const onEditorError = vi.fn();

    const { getByText } = render(
      <Harness
        plugins={[makeMoveCmdPlugin()]}
        editorHooks={{
          onBeforeApplyPatches: () => {
            throw new Error('hook boom');
          },
        }}
        onEditorError={onEditorError}
        onNodesChange={onNodesChange}
      />
    );

    await act(async () => {
      getByText('move').click();
    });

    expect(onEditorError).toHaveBeenCalled();
    const nextNodes = onNodesChange.mock.calls.slice(-1)[0]?.[0] as NodeData[];
    expect(nextNodes[0]).toMatchObject({ id: 'a', x: 5, y: 6 });
  });

  it('reports command error and returns false (no throw)', async () => {
    const onEditorError = vi.fn();

    const { getByText } = render(<Harness plugins={[makeThrowCmdPlugin()]} onEditorError={onEditorError} />);

    await act(async () => {
      expect(() => getByText('throw').click()).not.toThrow();
    });

    expect(onEditorError).toHaveBeenCalled();
  });
});
