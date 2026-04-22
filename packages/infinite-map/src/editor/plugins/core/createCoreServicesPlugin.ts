import type { Camera } from '../../../core/types';
import type { ChangeMeta, InfiniteMapPlugin, MapContext, NodePatch } from '../../types';
import { STORE_KEYS } from '../../keys';
import type { ToolbarItem } from '../hud/createToolbarPlugin';
import type { ContextMenuItem } from '../hud/createDefaultContextMenuPlugin';

/**
 * 核心 services（建议默认启用）
 * - camera：允许插件以统一方式驱动相机（底层通过 bus 'camera:change'）
 * - document：统一的 patches 入口
 * - hud：允许插件“贡献” toolbar / contextmenu 的默认 items（不需要 fork 默认 UI）
 */
export function createCoreServicesPlugin(): InfiniteMapPlugin {
  return {
    id: 'core-services',
    provides: ['services', 'camera', 'document', 'hud'],
    setup: (ctx: MapContext) => {
      // 初始化 HUD registry（保证 get 时总有数组）
      if (!ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems)) ctx.store.set(STORE_KEYS.toolbarItems, []);
      if (!ctx.store.get<ContextMenuItem[]>(STORE_KEYS.contextMenuItems)) ctx.store.set(STORE_KEYS.contextMenuItems, []);

      ctx.registerService('camera', {
        get: () => ctx.getCamera(),
        set: (next: Camera, immediate?: boolean) =>
          ctx.bus.emit('camera:change', { camera: next, immediate: Boolean(immediate) }),
      });
      ctx.registerService('document', {
        applyPatches: (patches: NodePatch[], meta: ChangeMeta) => ctx.applyPatches(patches, meta),
      });

      ctx.registerService('hud', {
        addToolbarItems: (items: ToolbarItem[]) => {
          const cur = ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems) ?? [];
          ctx.store.set(STORE_KEYS.toolbarItems, [...cur, ...items]);
        },
        addContextMenuItems: (items: ContextMenuItem[]) => {
          const cur = ctx.store.get<ContextMenuItem[]>(STORE_KEYS.contextMenuItems) ?? [];
          ctx.store.set(STORE_KEYS.contextMenuItems, [...cur, ...items]);
        },
        getToolbarItems: () => ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems) ?? [],
        getContextMenuItems: () => ctx.store.get<ContextMenuItem[]>(STORE_KEYS.contextMenuItems) ?? [],
      });
    },
  };
}
