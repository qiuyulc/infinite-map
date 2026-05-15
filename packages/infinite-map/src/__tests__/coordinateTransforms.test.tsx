import { describe, expect, it } from 'vitest';
import React, { useEffect, useRef } from 'react';
import { render } from '@testing-library/react';
import { useCoordinateTransforms } from '../hooks/useCoordinateTransforms';

describe('useCoordinateTransforms', () => {
  it('converts between screen/world and rects', () => {
    const out = { current: null as any };
    function Harness() {
      const cameraRef = useRef({ x: 10, y: 20, zoom: 2 });
      const viewportRef = useRef({ w: 400, h: 300 });
      const api = useCoordinateTransforms(cameraRef as any, viewportRef as any);
      useEffect(() => {
        out.current = api;
      }, [api]);
      return null;
    }
    render(<Harness />);

    // screen(20,40) relative to top-left; viewport center at (200,150)
    // screenToWorld: cam.x + (sx - vp.w/2) / z = 10 + (20-200)/2 = -80, 20 + (40-150)/2 = -35
    // worldToScreen: (wx - cam.x) * z + vp.w/2 = (20-10)*2 + 200 = 220, (40-20)*2 + 150 = 190
    expect(out.current.screenToWorld({ x: 20, y: 40 })).toEqual({ x: -80, y: -35 });
    expect(out.current.worldToScreen({ x: 20, y: 40 })).toEqual({ x: 220, y: 190 });
    expect(out.current.rectScreenToWorld({ x: 0, y: 0, w: 20, h: 20 })).toEqual({ x: -90, y: -55, w: 10, h: 10 });
    expect(out.current.rectWorldToScreen({ x: 10, y: 20, w: 10, h: 10 })).toEqual({ x: 200, y: 150, w: 20, h: 20 });
  });
});

