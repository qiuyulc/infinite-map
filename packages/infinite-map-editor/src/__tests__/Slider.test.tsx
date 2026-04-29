import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Slider } from '../components/Slider';

afterEach(() => cleanup());

function setRect(el: Element, rect: Partial<DOMRect>) {
  (el as any).getBoundingClientRect = () =>
    ({
      left: rect.left ?? 0,
      top: rect.top ?? 0,
      width: rect.width ?? 0,
      height: rect.height ?? 0,
      right: (rect.left ?? 0) + (rect.width ?? 0),
      bottom: (rect.top ?? 0) + (rect.height ?? 0),
      x: rect.left ?? 0,
      y: rect.top ?? 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe('Slider', () => {
  it('pointer sets value from clientX and shows tip', () => {
    const onChange = vi.fn();
    render(<Slider value={0} min={0} max={100} step={10} onChange={onChange} label="zoom" />);
    const track = screen.getByRole('slider', { name: 'zoom' });
    setRect(track, { left: 0, width: 200 });

    fireEvent.pointerDown(track, { pointerId: 1, clientX: 100 });
    // 100/200=0.5 => 50 => snapped 50
    expect(onChange).toHaveBeenCalledWith(50);
    expect(document.querySelector('.im-slider-tip')?.className).toContain('is-visible');
  });

  it('keyboard arrows/home/end change value', () => {
    const onChange = vi.fn();
    render(<Slider value={50} min={0} max={100} step={10} onChange={onChange} label="zoom" />);
    const track = screen.getByRole('slider', { name: 'zoom' });

    fireEvent.keyDown(track, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(60);

    fireEvent.keyDown(track, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith(0);

    fireEvent.keyDown(track, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(100);
  });
});

