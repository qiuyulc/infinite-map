import React from 'react';
import type { InfiniteMapPlugin } from '../types';
import { MinimapOverlay } from './MinimapOverlay';

export type MinimapPluginOptions = {
  width?: number;
  height?: number;
  cachePadding?: number;
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
  return {
    id: 'minimap',
    provides: ['minimap'],
    requires: ['camera'],
    slot: 'hud',
    overlayPointerEvents: 'auto',
    overlay: ({ ctx }) => React.createElement(MinimapOverlay, { ctx, opts }),
  };
}
