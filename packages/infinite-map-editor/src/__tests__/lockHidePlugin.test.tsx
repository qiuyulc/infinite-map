import { describe, expect, it, vi } from 'vitest';
import type { MapContext, NodeData, NodePatch } from '@qiuyulc/infinite-map';
import { createEventBus, createStore, STORE_KEYS } from '@qiuyulc/infinite-map';
import { createLockHidePlugin } from '../plugins/createLockHidePlugin';

function makeCtx(nodes: NodeData[], selectionIds: string[]) {
  const store = createStore();
  const bus = createEventBus();
  const services: Record<string, unknown> = {};
  const applyPatches = vi.fn<(patches: NodePatch[], meta: any) => void>();
  const requestRender = vi.fn();
  const clear = vi.fn();
  const setIds = vi.fn();
  const addToolbarItems = vi.fn();
  const addContextMenuItems = vi.fn();

  services.selection = { getIds: () => selectionIds, clear, setIds };
  services.document = { applyPatches };
  services.hud = { addToolbarItems, addContextMenuItems };

  const ctx: MapContext = {
    store,
    bus,
    services,
    registerService: (name: string, s: unknown) => (services[name] = s),
    getService: (name: string) => services[name] as any,
    getCamera: () => ({ x: 0, y: 0, zoom: 1 } as any),
    getViewport: () => ({ w: 800, h: 600 }),
    getNodes: () => nodes,
    getVisibleNodes: () => nodes,
    screenToWorld: (p) => p,
    worldToScreen: (p) => p,
    rectScreenToWorld: (r) => r,
    rectWorldToScreen: (r) => r,
    queryNodesInWorldRect: () => [],
    applyPatches: () => {},
    requestRender,
  } as any;

  return { ctx, applyPatches, requestRender, clear, addToolbarItems, addContextMenuItems };
}

describe('createLockHidePlugin', () => {
  it('lock/hide/showAll apply expected patches', () => {
    const nodes: NodeData[] = [{ id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, data: {} }];
    const { ctx, applyPatches, clear } = makeCtx(nodes, ['a']);
    const plugin = createLockHidePlugin();

    plugin.commands?.['edit.lock']?.run(ctx);
    expect(applyPatches).toHaveBeenCalled();
    expect((applyPatches.mock.calls.at(-1)![0][0] as any).data.locked).toBe(true);

    plugin.commands?.['edit.hide']?.run(ctx);
    expect((applyPatches.mock.calls.at(-1)![0][0] as any).data.hidden).toBe(true);
    expect(clear).toHaveBeenCalled();

    // showAll: needs hidden nodes
    const nodes2: NodeData[] = [
      { id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, hidden: true, data: {} },
      { id: 'b', type: 'default', x: 0, y: 0, width: 10, height: 10, data: {} },
    ];
    const { ctx: ctx2, applyPatches: ap2 } = makeCtx(nodes2, []);
    plugin.commands?.['edit.showAll']?.run(ctx2);
    expect((ap2.mock.calls.at(-1)![0][0] as any).data.hidden).toBe(false);
  });

  it('unlock only targets locked nodes and supports context-menu hitNodeId fallback', () => {
    const nodes: NodeData[] = [
      { id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, locked: true, data: {} },
      { id: 'b', type: 'default', x: 20, y: 0, width: 10, height: 10, data: {} },
    ];
    const { ctx, applyPatches } = makeCtx(nodes, ['a', 'b']);
    const plugin = createLockHidePlugin();

    plugin.commands?.['edit.unlock']?.run(ctx);
    const patches = applyPatches.mock.calls.at(-1)![0] as any[];
    expect(patches).toHaveLength(1);
    expect(patches[0].id).toBe('a');
    expect(patches[0].data.locked).toBe(false);

    // selection empty -> use contextMenuState.hitNodeId
    const { ctx: ctx2, applyPatches: ap2 } = makeCtx(nodes, []);
    ctx2.store.set(STORE_KEYS.contextMenuState, {
      screen: { x: 0, y: 0 },
      world: { x: 0, y: 0 },
      selectionIds: [],
      hitNodeId: 'b',
    });
    plugin.commands?.['edit.lock']?.run(ctx2);
    const p2 = ap2.mock.calls.at(-1)![0][0] as any;
    expect(p2.id).toBe('b');
    expect(p2.data.locked).toBe(true);
  });

  it('setup contributes toolbar/contextmenu items via hud service', () => {
    const nodes: NodeData[] = [{ id: 'a', type: 'default', x: 0, y: 0, width: 10, height: 10, data: {} }];
    const { ctx, addToolbarItems, addContextMenuItems } = makeCtx(nodes, ['a']);
    const plugin = createLockHidePlugin();

    // open menu payload path coverage
    ctx.store.set(STORE_KEYS.contextMenuState, {
      screen: { x: 0, y: 0 },
      world: { x: 0, y: 0 },
      selectionIds: ['a'],
      hitNodeId: 'a',
    });

    plugin.setup?.(ctx);
    expect(addToolbarItems).toHaveBeenCalled();
    expect(addContextMenuItems).toHaveBeenCalled();

    // validate enabled predicates
    const toolbarItems = addToolbarItems.mock.calls[0]![0] as any[];
    const lockBtn = toolbarItems.find((x) => x.id === 'edit.lock');
    expect(lockBtn.enabled(ctx)).toBe(true);

    const unlockBtn = toolbarItems.find((x) => x.id === 'edit.unlock');
    expect(unlockBtn.enabled(ctx)).toBe(false); // node is not locked

    const menuItems = addContextMenuItems.mock.calls[0]![0] as any[];
    const lockMenu = menuItems.find((x) => x.id === 'edit.lock');
    expect(lockMenu.enabled(ctx, { selectionIds: ['a'], hitNodeId: null })).toBe(true);
  });
});
