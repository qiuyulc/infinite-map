import { describe, expect, it } from 'vitest';
import type { NodeData } from '../core/types';
import { applyPatchesToNodes } from '../editor/runtime';

describe('applyPatchesToNodes', () => {
  it('applies move/set/add/remove in order', () => {
    const a: NodeData = { id: 'a', x: 0, y: 0, width: 10, height: 10, label: 'A' };
    const b: NodeData = { id: 'b', x: 10, y: 0, width: 10, height: 10, label: 'B' };

    const next = applyPatchesToNodes([a, b], [
      { type: 'move', id: 'a', x: 5, y: 6 },
      { type: 'set', id: 'b', data: { label: 'B2', z: 3 } },
      { type: 'add', node: { id: 'c', x: 0, y: 0, width: 1, height: 1 } },
      { type: 'remove', id: 'a' },
    ]);

    expect(next.map((n) => n.id)).toEqual(['b', 'c']);
    expect(next[0]).toMatchObject({ id: 'b', label: 'B2', z: 3 });
  });
});

