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
import { createClipboardPlugin } from '../plugins/createClipboardPlugin';
import { createGroupPlugin } from '../plugins/createGroupPlugin';
import { createCoreServicesPlugin } from '../plugins/createCoreServicesPlugin';

function makeCtx(initialNodes: NodeData[]) {
  const bus = createEventBus();
  const store = createStore();
  let nodes = initialNodes;
  let selectionIds: string[] = [];

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
      // mimic InfiniteMap.applyPatches: emit patches:applied with before snapshot, then update nodes
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

  // document/camera/hud services
  createCoreServicesPlugin().setup?.(ctx);
  // group service (expandIds)
  createGroupPlugin().setup?.(ctx);

  return {
    ctx,
    store,
    setSelection: (ids: string[]) => {
      selectionIds = ids;
      store.set(STORE_KEYS.selectionIds, ids);
    },
    getNodes: () => nodes,
  };
}

describe('clipboard + group', () => {
  it('copy/paste keeps parentId relationship by remapping ids', () => {
    const { ctx, store, setSelection, getNodes } = makeCtx([
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
      { id: 'b', parentId: 'g', x: 30, y: 10, width: 10, height: 10 },
    ]);

    const clipboard = createClipboardPlugin({ offsetWorld: 10 });

    setSelection(['g']);
    clipboard.commands?.['edit.copy']?.run(ctx, { source: 'api' });
    const data = store.get<any>(STORE_KEYS.clipboardData);
    expect(data?.nodes?.length).toBe(3);

    clipboard.commands?.['edit.paste']?.run(ctx, { source: 'api' });
    const pastedIds = store.get<string[]>(STORE_KEYS.selectionIds) ?? [];
    expect(pastedIds.length).toBe(3);

    const all = getNodes();
    const pasted = all.filter((n) => pastedIds.includes(n.id));
    const newGroup = pasted.find((n) => n.kind === 'group');
    expect(newGroup).toBeTruthy();
    const children = pasted.filter((n) => n.parentId === newGroup!.id).map((n) => n.id);
    expect(children.length).toBe(2);
  });

  it('duplicate keeps parentId relationship when duplicating a group selection', () => {
    const { ctx, store, setSelection, getNodes } = makeCtx([
      { id: 'g', kind: 'group', x: 0, y: 0, width: 100, height: 100 },
      { id: 'a', parentId: 'g', x: 10, y: 10, width: 10, height: 10 },
      { id: 'b', parentId: 'g', x: 30, y: 10, width: 10, height: 10 },
    ]);

    const clipboard = createClipboardPlugin({ offsetWorld: 10 });

    setSelection(['g']);
    clipboard.commands?.['edit.duplicate']?.run(ctx, { source: 'api' });

    const dupIds = store.get<string[]>(STORE_KEYS.selectionIds) ?? [];
    expect(dupIds.length).toBe(3);
    const dup = getNodes().filter((n) => dupIds.includes(n.id));
    const newGroup = dup.find((n) => n.kind === 'group');
    expect(newGroup).toBeTruthy();
    expect(dup.filter((n) => n.parentId === newGroup!.id).length).toBe(2);
  });
});
