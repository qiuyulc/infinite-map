import { describe, expect, it } from 'vitest';
import type { NodeData } from '../core/types';
import { expandIdsWithGroups, isHiddenEffective, isLockedEffective } from '../editor/groupUtils';

describe('groupUtils', () => {
  const nodes: NodeData[] = [
    { id: 'g1', kind: 'group', x: 0, y: 0, width: 100, height: 100, locked: true },
    { id: 'n1', parentId: 'g1', x: 10, y: 10, width: 10, height: 10 },
    { id: 'g2', kind: 'group', parentId: 'g1', x: 20, y: 20, width: 40, height: 40, hidden: true },
    { id: 'n2', parentId: 'g2', x: 25, y: 25, width: 10, height: 10 },
  ];

  it('isLockedEffective / isHiddenEffective should propagate from ancestors', () => {
    expect(isLockedEffective(nodes, 'n1')).toBe(true);
    expect(isLockedEffective(nodes, 'g2')).toBe(true);

    expect(isHiddenEffective(nodes, 'g2')).toBe(true);
    expect(isHiddenEffective(nodes, 'n2')).toBe(true);
    expect(isHiddenEffective(nodes, 'n1')).toBe(false);
  });

  it('expandIdsWithGroups expands group descendants', () => {
    const expanded = expandIdsWithGroups(nodes, ['g1']);
    // g1 + n1 + g2 + n2
    expect(new Set(expanded)).toEqual(new Set(['g1', 'n1', 'g2', 'n2']));
  });
});

