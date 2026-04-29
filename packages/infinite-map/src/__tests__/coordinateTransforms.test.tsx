import { describe, expect, it } from 'vitest';
import React, { useEffect, useRef } from 'react';
import { render } from '@testing-library/react';
import { useCoordinateTransforms } from '../hooks/useCoordinateTransforms';

describe('useCoordinateTransforms', () => {
  it('converts between screen/world and rects', () => {
    const out = { current: null as any };
    function Harness() {
      const cameraRef = useRef({ x: 10, y: 20, zoom: 2 });
      const api = useCoordinateTransforms(cameraRef as any);
      useEffect(() => {
        out.current = api;
      }, [api]);
      return null;
    }
    render(<Harness />);

    expect(out.current.screenToWorld({ x: 20, y: 40 })).toEqual({ x: 20, y: 40 });
    expect(out.current.worldToScreen({ x: 20, y: 40 })).toEqual({ x: 20, y: 40 });
    expect(out.current.rectScreenToWorld({ x: 0, y: 0, w: 20, h: 20 })).toEqual({ x: 10, y: 20, w: 10, h: 10 });
    expect(out.current.rectWorldToScreen({ x: 10, y: 20, w: 10, h: 10 })).toEqual({ x: 0, y: 0, w: 20, h: 20 });
  });
});

