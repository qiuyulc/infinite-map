import { describe, expect, it } from 'vitest';
import type { NodeData } from '../core/types';
import { computeLayout } from '../layout/layoutPresets';

function makeNodes(n: number): NodeData[] {
  return Array.from({ length: n }).map((_, i) => ({
    id: `n${i}`,
    type: 'default',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    data: { title: `N${i}` },
  }));
}

describe('layoutPresets', () => {
  it('grid preset places nodes in centered grid', () => {
    const nodes = makeNodes(4);
    const out = computeLayout(nodes, 'grid', { grid: { gap: 10 } });
    expect(out).toHaveLength(4);
    // should not all be at origin
    expect(new Set(out.map((n) => `${n.x},${n.y}`)).size).toBeGreaterThan(1);
    // centered around 0 roughly (since ox/oy are -total/2)
    const avgX = out.reduce((s, n) => s + n.x, 0) / out.length;
    const avgY = out.reduce((s, n) => s + n.y, 0) / out.length;
    expect(Math.abs(avgX)).toBeLessThan(200);
    expect(Math.abs(avgY)).toBeLessThan(200);
  });

  it('random preset is deterministic with same seed', () => {
    const nodes = makeNodes(10);
    const a = computeLayout(nodes, 'random', { seed: 42 });
    const b = computeLayout(nodes, 'random', { seed: 42 });
    expect(a.map((n) => [n.x, n.y])).toEqual(b.map((n) => [n.x, n.y]));
  });

  it('custom preset applies coordinates by id', () => {
    const nodes = makeNodes(3);
    const out = computeLayout(nodes, 'custom', { custom: { n1: { x: 7, y: 9 } } });
    expect(out.find((n) => n.id === 'n1')?.x).toBe(7);
    expect(out.find((n) => n.id === 'n1')?.y).toBe(9);
    // untouched node unchanged
    expect(out.find((n) => n.id === 'n0')?.x).toBe(0);
  });
});

