import { describe, expect, it } from 'vitest';
import type { NodeData } from '@qiuyulc/infinite-map';
import { normalizeHitIdForSelectedGroups } from '../editor/hitNormalize';

const noAlt = { alt: false };

describe('normalizeHitIdForSelectedGroups', () => {
  it('returns hitId when no ancestor group exists', () => {
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ];
    expect(
      normalizeHitIdForSelectedGroups({ nodes, hitId: 'a', selectedIds: [], modifiers: noAlt })
    ).toBe('a');
  });

  it('promotes child node to outermost ancestor group', () => {
    const nodes: NodeData[] = [
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
    ];
    expect(
      normalizeHitIdForSelectedGroups({ nodes, hitId: 'a', selectedIds: [], modifiers: noAlt })
    ).toBe('g');
  });

  it('promotes to outermost group in nested hierarchy', () => {
    const nodes: NodeData[] = [
      { id: 'g1', kind: 'group', x: 0, y: 0, width: 200, height: 200 },
      { id: 'g2', kind: 'group', parentId: 'g1', x: 10, y: 10, width: 100, height: 100 },
      { id: 'a', parentId: 'g2', x: 20, y: 20, width: 10, height: 10 },
    ];
    expect(
      normalizeHitIdForSelectedGroups({ nodes, hitId: 'a', selectedIds: [], modifiers: noAlt })
    ).toBe('g1');
  });

  it('returns hitId when already selected (protects double-click penetration)', () => {
    const nodes: NodeData[] = [
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
    ];
    expect(
      normalizeHitIdForSelectedGroups({ nodes, hitId: 'a', selectedIds: ['a'], modifiers: noAlt })
    ).toBe('a');
  });

  it('returns group id when a different child is selected', () => {
    const nodes: NodeData[] = [
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
      { id: 'b', parentId: 'g', x: 30, y: 30, width: 10, height: 10 },
    ];
    expect(
      normalizeHitIdForSelectedGroups({ nodes, hitId: 'a', selectedIds: ['b'], modifiers: noAlt })
    ).toBe('g');
  });

  it('returns hitId for standalone node when another node is selected', () => {
    const nodes: NodeData[] = [
      { id: 'a', x: 0, y: 0, width: 100, height: 80 },
      { id: 'b', x: 200, y: 0, width: 100, height: 80 },
    ];
    expect(
      normalizeHitIdForSelectedGroups({ nodes, hitId: 'a', selectedIds: ['b'], modifiers: noAlt })
    ).toBe('a');
  });
});
