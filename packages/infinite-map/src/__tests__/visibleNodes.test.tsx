import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useEffect, useState } from 'react';
import { render, cleanup } from '@testing-library/react';
import type { Camera, NodeData } from '../core/types';
import { useVisibleNodes } from '../hooks/useVisibleNodes';

function Harness(props: { nodes: NodeData[]; camera: Camera; keepAliveIdSet?: Set<string> }) {
  const [out, setOut] = useState<string[]>([]);
  const viewport = { w: 100, h: 100 };
  const { visibleNodes } = useVisibleNodes({
    nodes: props.nodes,
    camera: props.camera,
    viewport,
    cellSize: 100,
    overscanPx: 0,
    enabled: true,
    keepAliveIdSet: props.keepAliveIdSet,
  });

  useEffect(() => {
    setOut(visibleNodes.map((n) => n.id));
  }, [visibleNodes]);

  return <div data-testid="out">{out.join(',')}</div>;
}

describe('useVisibleNodes', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('propagates hidden from ancestors', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1 as any;
    });
    vi.stubGlobal('cancelAnimationFrame', () => void 0);

    const nodes: NodeData[] = [
      { id: 'g', kind: 'group', hidden: true, x: 0, y: 0, width: 50, height: 50 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
      { id: 'b', x: 10, y: 10, width: 10, height: 10 },
    ];
    const { getByTestId } = render(<Harness nodes={nodes} camera={{ x: 0, y: 0, zoom: 1 }} />);
    expect(getByTestId('out').textContent).toBe('b');
  });

  it('includes keepAliveIdSet nodes even when outside view rect', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 1 as any;
    });
    vi.stubGlobal('cancelAnimationFrame', () => void 0);

    const nodes: NodeData[] = [
      { id: 'in', x: 10, y: 10, width: 10, height: 10 },
      { id: 'out', x: 1000, y: 1000, width: 10, height: 10 },
    ];
    const keepAliveIdSet = new Set<string>(['out']);
    const { getByTestId } = render(<Harness nodes={nodes} camera={{ x: 0, y: 0, zoom: 1 }} keepAliveIdSet={keepAliveIdSet} />);
    // 排序稳定：z 相等时按 id
    expect(getByTestId('out').textContent).toBe('in,out');
  });
});

