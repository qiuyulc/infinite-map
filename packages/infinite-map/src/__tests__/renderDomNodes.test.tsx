import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { useRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Camera, NodeData } from '../core/types';
import { DefaultNode } from '../components/DefaultNode';
import { RenderDomNodes } from '../components/RenderDomNodes';

afterEach(() => cleanup());

describe('DefaultNode / RenderDomNodes', () => {
  it('DefaultNode renders title and meta when enabled', () => {
    const n: NodeData = { id: 'a', x: 12.2, y: 9.8, width: 100, height: 50, label: 'A' };
    render(
      <DefaultNode n={n} showMeta>
        <div>content</div>
      </DefaultNode>
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('(12, 10)')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('RenderDomNodes calls onNodeDrag on pointer drag sequence', async () => {
    const camRef = { current: { x: 0, y: 0, zoom: 2 } satisfies Camera };
    const nodes: NodeData[] = [{ id: 'a', x: 0, y: 0, width: 80, height: 40, label: 'A' }];
    const onNodeDrag = vi.fn();

    render(<RenderDomNodes cameraRef={camRef as any} visibleNodes={nodes} onNodeDrag={onNodeDrag} defaultNodeShowMeta />);

    const el = document.querySelector('[data-im-node-id="a"]') as HTMLElement;
    expect(el).toBeTruthy();

    // start drag at (10,10) move to (30,10) => dx=20/zoom(2)=10
    fireEvent.pointerDown(el, { pointerId: 1, buttons: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(el, { pointerId: 1, buttons: 1, clientX: 30, clientY: 10 });
    fireEvent.pointerUp(el, { pointerId: 1, buttons: 0, clientX: 30, clientY: 10 });

    expect(onNodeDrag).toHaveBeenCalledWith('a', { x: 10, y: 0 }, 'move');
    expect(onNodeDrag).toHaveBeenCalledWith('a', { x: 10, y: 0 }, 'end');
  });
});

