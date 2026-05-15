import { describe, expect, it } from 'vitest';
import {
  applyPatchesToNodes,
  createEventBus,
  createStore,
  STORE_KEYS,
  type Camera,
  type ChangeMeta,
  type MapContext,
  type NodeData,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import { createGroupPlugin } from '../plugins/createGroupPlugin';
import { createCoreServicesPlugin } from '../plugins/createCoreServicesPlugin';
import { buildById } from '../editor/groupUtils';

function makeCtx(initialNodes: NodeData[], initialSel: string[] = []) {
  const bus = createEventBus();
  const store = createStore();
  let nodes = initialNodes;
  let selectionIds = initialSel.slice();

  const ctx: MapContext = {
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } satisfies Camera),
    getViewport: () => ({ w: 1000, h: 800 }),
    getNodes: () => nodes,
    getVisibleNodes: () => nodes.filter((n) => !n.hidden),
    queryNodesInWorldRect: () => nodes,
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    bus,
    store,
    services: {},
    registerService: (name, service) => ((ctx.services as any)[name] = service),
    getService: (name) => (ctx.services as any)[name],
    requestRender: () => void 0,
    applyPatches: (patches: NodePatch[], meta: ChangeMeta) => {
      const beforeById: Record<string, NodeData | undefined> = {};
      const byId = new Map(nodes.map((n) => [n.id, n] as const));
      for (const p of patches) {
        const id = p.type === 'add' ? p.node.id : p.id;
        if (!(id in beforeById)) beforeById[id] = byId.get(id);
      }
      bus.emit('patches:applied', { patches, meta, beforeById });
      nodes = applyPatchesToNodes(nodes, patches);
    },
  } as MapContext;

  ctx.registerService('selection', {
    getIds: () => selectionIds,
    setIds: (ids: string[]) => {
      selectionIds = ids;
      store.set(STORE_KEYS.selectionIds, ids);
    },
    clear: () => {
      selectionIds = [];
      store.set(STORE_KEYS.selectionIds, []);
    },
  });

  return { ctx, store, bus, getNodes: () => nodes, getSelection: () => selectionIds };
}

describe('createGroupPlugin — promotion logic', () => {
  it('groups standalone nodes into a new group', () => {
    const { ctx, getNodes, getSelection } = makeCtx(
      [
        { id: 'a', x: 0, y: 0, width: 100, height: 80 },
        { id: 'b', x: 200, y: 0, width: 100, height: 80 },
      ],
      ['a', 'b']
    );

    const core = createCoreServicesPlugin();
    const group = createGroupPlugin();
    core.setup?.(ctx);
    group.setup?.(ctx);

    group.commands!['edit.group'].run(ctx);

    const nodes = getNodes();
    const sel = getSelection();
    const groupNode = nodes.find((n) => n.kind === 'group');
    expect(groupNode).toBeTruthy();
    expect(sel).toEqual([groupNode!.id]);
    // a and b should be children of the new group
    const byId = buildById(nodes);
    expect(byId.get('a')!.parentId).toBe(groupNode!.id);
    expect(byId.get('b')!.parentId).toBe(groupNode!.id);
  });

  it('promotes child node to its group when grouping with standalone node', () => {
    // G → A. Select A + C and group.
    const { ctx, getNodes, getSelection } = makeCtx(
      [
        { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
        { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
        { id: 'c', x: 200, y: 0, width: 100, height: 80 },
      ],
      ['a', 'c'] // pretend double-click selected 'a' directly
    );

    const core = createCoreServicesPlugin();
    const group = createGroupPlugin();
    core.setup?.(ctx);
    group.setup?.(ctx);

    group.commands!['edit.group'].run(ctx);

    const nodes = getNodes();
    const byId = buildById(nodes);
    // a should be promoted to g, so picked = [g, c]
    const groupNode = nodes.find((n) => n.kind === 'group' && n.id !== 'g');
    expect(groupNode).toBeTruthy();
    // g.parentId should be the new group
    expect(byId.get('g')!.parentId).toBe(groupNode!.id);
    // c.parentId should be the new group
    expect(byId.get('c')!.parentId).toBe(groupNode!.id);
    // a should still be child of g
    expect(byId.get('a')!.parentId).toBe('g');
  });

  it('promotes to outermost group in nested hierarchy', () => {
    // G1 → G2 → A. Select A + C and group.
    const { ctx, getNodes } = makeCtx(
      [
        { id: 'g1', kind: 'group', x: 0, y: 0, width: 200, height: 200 },
        { id: 'g2', kind: 'group', parentId: 'g1', x: 10, y: 10, width: 100, height: 100 },
        { id: 'a', parentId: 'g2', x: 20, y: 20, width: 10, height: 10 },
        { id: 'c', x: 300, y: 0, width: 100, height: 80 },
      ],
      ['a', 'c']
    );

    const core = createCoreServicesPlugin();
    const group = createGroupPlugin();
    core.setup?.(ctx);
    group.setup?.(ctx);

    group.commands!['edit.group'].run(ctx);

    const nodes = getNodes();
    const byId = buildById(nodes);
    // a → g2 → g1 promoted to g1. picked = [g1, c]
    const groupNode = nodes.find((n) => n.kind === 'group' && n.id !== 'g1' && n.id !== 'g2');
    expect(groupNode).toBeTruthy();
    expect(byId.get('g1')!.parentId).toBe(groupNode!.id);
    expect(byId.get('c')!.parentId).toBe(groupNode!.id);
    // g2 and a should be untouched
    expect(byId.get('g2')!.parentId).toBe('g1');
    expect(byId.get('a')!.parentId).toBe('g2');
  });

  it('promotes inner group to outermost when grouping with standalone node', () => {
    // G1 → G2. Select G2 + D and group.
    // G2 should be promoted to G1, so picked = [G1, D]
    const { ctx, getNodes } = makeCtx(
      [
        { id: 'g1', kind: 'group', x: 0, y: 0, width: 200, height: 200 },
        { id: 'g2', kind: 'group', parentId: 'g1', x: 10, y: 10, width: 100, height: 100 },
        { id: 'd', x: 300, y: 0, width: 100, height: 80 },
      ],
      ['g2', 'd']
    );

    const core = createCoreServicesPlugin();
    const group = createGroupPlugin();
    core.setup?.(ctx);
    group.setup?.(ctx);

    group.commands!['edit.group'].run(ctx);

    const nodes = getNodes();
    const byId = buildById(nodes);
    // G2 promoted to G1, picked = [G1, D]
    const newGroup = nodes.find((n) => n.kind === 'group' && n.id !== 'g1' && n.id !== 'g2');
    expect(newGroup).toBeTruthy();
    expect(byId.get('g1')!.parentId).toBe(newGroup!.id);
    expect(byId.get('d')!.parentId).toBe(newGroup!.id);
    // G2 should still be child of G1
    expect(byId.get('g2')!.parentId).toBe('g1');
  });

  it('removes child when its group ancestor is also selected (coverage)', () => {
    // G1 → G2 → A. Select A AND G2 + C and group.
    // A should be covered by G2 → removed. Then G2 promoted to G1. picked = [G1, C]
    const { ctx, getNodes } = makeCtx(
      [
        { id: 'g1', kind: 'group', x: 0, y: 0, width: 200, height: 200 },
        { id: 'g2', kind: 'group', parentId: 'g1', x: 10, y: 10, width: 100, height: 100 },
        { id: 'a', parentId: 'g2', x: 20, y: 20, width: 10, height: 10 },
        { id: 'c', x: 300, y: 0, width: 100, height: 80 },
      ],
      ['a', 'g2', 'c']
    );

    const core = createCoreServicesPlugin();
    const group = createGroupPlugin();
    core.setup?.(ctx);
    group.setup?.(ctx);

    group.commands!['edit.group'].run(ctx);

    const nodes = getNodes();
    const byId = buildById(nodes);
    const newGroup = nodes.find((n) => n.kind === 'group' && n.id !== 'g1' && n.id !== 'g2');
    expect(newGroup).toBeTruthy();
    // G1 should be child of new group
    expect(byId.get('g1')!.parentId).toBe(newGroup!.id);
    expect(byId.get('c')!.parentId).toBe(newGroup!.id);
    // G2 still under G1, A still under G2
    expect(byId.get('g2')!.parentId).toBe('g1');
    expect(byId.get('a')!.parentId).toBe('g2');
  });

  it('ungroup removes group and clears parentId of direct children', () => {
    const { ctx, getNodes, getSelection } = makeCtx(
      [
        { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
        { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
        { id: 'b', parentId: 'g', x: 30, y: 30, width: 10, height: 10 },
      ],
      ['g']
    );

    const core = createCoreServicesPlugin();
    const group = createGroupPlugin();
    core.setup?.(ctx);
    group.setup?.(ctx);

    group.commands!['edit.ungroup'].run(ctx);

    const nodes = getNodes();
    const sel = getSelection();
    // Group node removed
    expect(nodes.find((n) => n.id === 'g')).toBeUndefined();
    // Children parentId cleared
    expect(nodes.find((n) => n.id === 'a')!.parentId).toBeUndefined();
    expect(nodes.find((n) => n.id === 'b')!.parentId).toBeUndefined();
    // Children become selected
    expect(new Set(sel)).toEqual(new Set(['a', 'b']));
  });
});
