import { STORE_KEYS, type Camera, type ChangeMeta, type InfiniteMapPlugin, type MapContext, type NodePatch } from '@qiuyulc/infinite-map';
import type { ToolbarItem } from './createToolbarPlugin';
import type { ContextMenuItem } from './createDefaultContextMenuPlugin';

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

      const normalizeDividers = <T extends { type: 'divider' } | { type: 'command'; id: string }>(items: T[]) => {
        const out: T[] = [];
        for (const it of items) {
          if ((it as any).type === 'divider') {
            if (out.length === 0) continue;
            if ((out[out.length - 1] as any).type === 'divider') continue;
            out.push(it);
            continue;
          }
          out.push(it);
        }
        if (out.length && (out[out.length - 1] as any).type === 'divider') out.pop();
        return out;
      };

      ctx.registerService('camera', {
        get: () => ctx.getCamera(),
        set: (next: Camera, immediate?: boolean) => ctx.bus.emit('camera:change', { camera: next, immediate: Boolean(immediate) }),
      });
      ctx.registerService('document', {
        applyPatches: (patches: NodePatch[], meta: ChangeMeta) => ctx.applyPatches(patches, meta),
      });

      ctx.registerService('hud', {
        addToolbarItems: (items: ToolbarItem[]) => {
          const cur = ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems) ?? [];
          // 兜底：React StrictMode / 热更新可能导致 setup 执行多次，这里做一次 divider 规范化，避免分割线越积越多
          ctx.store.set(STORE_KEYS.toolbarItems, normalizeDividers([...cur, ...items]));
        },
        addContextMenuItems: (items: ContextMenuItem[]) => {
          const cur = ctx.store.get<ContextMenuItem[]>(STORE_KEYS.contextMenuItems) ?? [];
          ctx.store.set(STORE_KEYS.contextMenuItems, normalizeDividers([...cur, ...items]));
        },
        getToolbarItems: () => ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems) ?? [],
        getContextMenuItems: () => ctx.store.get<ContextMenuItem[]>(STORE_KEYS.contextMenuItems) ?? [],
      });
    },
  };
}
