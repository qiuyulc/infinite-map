import type { CSSProperties } from 'react';
import type { MapContext } from '../types';
import { STORE_KEYS } from '../keys';

type SnapGuides = {
  v?: number[]; // screen x
  h?: number[]; // screen y
};

export function SnapGuidesOverlay({ ctx }: { ctx: MapContext }) {
  const guides = ctx.store.get<SnapGuides>(STORE_KEYS.snapGuides);
  if (!guides || ((!guides.v || guides.v.length === 0) && (!guides.h || guides.h.length === 0))) return null;

  const styleV: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    background: 'var(--im-guide-stroke, rgba(168, 85, 247, 0.95))',
    boxShadow: '0 0 0 1px var(--im-guide-shadow, rgba(168, 85, 247, 0.18))',
    pointerEvents: 'none',
  };
  const styleH: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    background: 'var(--im-guide-stroke, rgba(168, 85, 247, 0.95))',
    boxShadow: '0 0 0 1px var(--im-guide-shadow, rgba(168, 85, 247, 0.18))',
    pointerEvents: 'none',
  };

  return (
    <>
      {(guides.v ?? []).map((x, i) => (
        <div key={`v-${i}`} style={{ ...styleV, left: x }} />
      ))}
      {(guides.h ?? []).map((y, i) => (
        <div key={`h-${i}`} style={{ ...styleH, top: y }} />
      ))}
    </>
  );
}
