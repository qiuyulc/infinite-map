import type { CSSProperties } from 'react';
import type { MapContext } from '../types';
import { STORE_KEYS } from '../keys';

const STORE_KEY = STORE_KEYS.marqueeState;

type MarqueeState = {
  active: boolean;
  startScreen: { x: number; y: number };
  currScreen: { x: number; y: number };
};

export function MarqueeOverlay({ ctx }: { ctx: MapContext }) {
  const st = ctx.store.get<MarqueeState>(STORE_KEY);
  if (!st?.active) return null;

  const left = Math.min(st.startScreen.x, st.currScreen.x);
  const top = Math.min(st.startScreen.y, st.currScreen.y);
  const w = Math.abs(st.currScreen.x - st.startScreen.x);
  const h = Math.abs(st.currScreen.y - st.startScreen.y);

  const style: CSSProperties = {
    position: 'absolute',
    left,
    top,
    width: w,
    height: h,
    borderRadius: 8,
    border: '1px solid rgba(110, 200, 255, 0.95)',
    background: 'rgba(110, 200, 255, 0.10)',
    boxShadow: '0 0 0 1px rgba(110, 200, 255, 0.12) inset',
    pointerEvents: 'none',
  };

  return <div style={style} />;
}
