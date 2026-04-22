import type { Camera } from '../../core/types';
import type { ChangeMeta, InfiniteMapPlugin, MapContext, NodePatch } from '../types';

/**
 * 核心 services（建议默认启用）
 * - camera：允许插件以统一方式驱动相机（底层通过 bus 'camera:change'）
 * - document：统一的 patches 入口
 */
export function createCoreServicesPlugin(): InfiniteMapPlugin {
  return {
    id: 'core-services',
    provides: ['services', 'camera', 'document'],
    setup: (ctx: MapContext) => {
      ctx.registerService('camera', {
        get: () => ctx.getCamera(),
        set: (next: Camera, immediate?: boolean) =>
          ctx.bus.emit('camera:change', { camera: next, immediate: Boolean(immediate) }),
      });
      ctx.registerService('document', {
        applyPatches: (patches: NodePatch[], meta: ChangeMeta) => ctx.applyPatches(patches, meta),
      });
    },
  };
}

