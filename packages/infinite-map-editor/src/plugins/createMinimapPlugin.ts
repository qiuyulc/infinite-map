import React from 'react';
import { STORE_KEYS, type InfiniteMapPlugin, type MapContext } from '@qiuyulc/infinite-map';
import { MinimapOverlay } from './MinimapOverlay';

export type MinimapPluginOptions = {
  width?: number;
  height?: number;
  cachePadding?: number;
  /**
   * 外部触发 minimap 强制刷新（任意值变化即可）
   * - 例如：节点内容由外部 store 驱动，但 nodes 本身不变时，可用该值通知 minimap 重绘
   */
  needsRedraw?: unknown;
  /**
   * 是否在 minimap 的“世界范围”计算中强制包含原点(0,0)
   * - 用于配合“center origin”语义：避免原点不在节点 bbox 内时，视口框跑到 minimap 外
   * - 默认 true
   */
  includeOrigin?: boolean;
  /**
   * 是否显示 minimap 的调试统计文案（默认 false）
   */
  showStats?: boolean;
};

export function createMinimapPlugin(opts: MinimapPluginOptions = {}): InfiniteMapPlugin {
  let ctxRef: Pick<MapContext, 'store' | 'registerService'> | null = null;
  const getConfig = () => ({
    width: opts.width ?? 260,
    height: opts.height ?? 160,
    cachePadding: opts.cachePadding ?? 120,
    needsRedraw: opts.needsRedraw,
  });
  return {
    id: 'minimap',
    provides: ['minimap'],
    requires: ['camera'],
    setup: (ctx) => {
      ctxRef = ctx;
      ctx.store.set(STORE_KEYS.minimapEnabled, true);
      // 将 minimap config 写入 store（由插件维护，而不是依赖 InfiniteMap 组件写入）
      ctx.store.set(STORE_KEYS.minimapConfig, getConfig());
      ctx.store.set(STORE_KEYS.minimapNeedsRedraw, opts.needsRedraw);

      // 提供 minimap service：给其它 HUD（如 zoomDock）做布局协作，避免读 minimapConfig/minimapEnabled
      ctx.registerService('minimap', {
        enabled: () => true,
        getConfig,
      });
    },
    teardown: () => {
      // 退出时标记为 false，便于其它 hud 组件做布局回退（例如 zoom slider 占用 minimap 的位置）
      ctxRef?.store.set(STORE_KEYS.minimapEnabled, false);
      ctxRef?.registerService('minimap', {
        enabled: () => false,
        getConfig,
      });
    },
    slot: 'hud',
    overlayPointerEvents: 'auto',
    overlay: ({ ctx }) => React.createElement(MinimapOverlay, { ctx, opts }),
  };
}
