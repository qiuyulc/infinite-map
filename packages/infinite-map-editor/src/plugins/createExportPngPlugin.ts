import type { Command, InfiniteMapPlugin, MapContext } from '@qiuyulc/infinite-map';

export type ExportPngPluginOptions = {
  /**
   * 默认导出范围
   * - all：整个画布（视口内或按宿主实现）
   * - selection：仅选区（按宿主实现）
   */
  defaultScope?: 'all' | 'selection';
  pixelRatio?: number;
  background?: string;
  fileName?: string;
};

/**
 * 导出 PNG（骨架）
 *
 * 说明：
 * - InfiniteMap 内核本身不依赖 DOM/canvas 截图库，避免引入沉重依赖与实现差异；
 * - 该插件只提供一个 command，并通过事件 `export:png` 通知宿主：
 *   宿主可在应用层订阅并用 html-to-image / canvas / playwright 等方式实现导出。
 */
export function createExportPngPlugin(opts: ExportPngPluginOptions = {}): InfiniteMapPlugin {
  const cmd: Command = {
    id: 'file.exportPng',
    title: 'Export PNG',
    run: (ctx: MapContext, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api' }) => {
      ctx.bus.emit('export:png', {
        scope: opts.defaultScope ?? 'all',
        pixelRatio: opts.pixelRatio,
        background: opts.background,
        fileName: opts.fileName,
        source: payload?.source, // 允许宿主做埋点（非必需）
      });
    },
  };

  return {
    id: 'export-png',
    provides: ['export'],
    requires: ['commands'],
    commands: {
      [cmd.id]: cmd,
    },
  };
}
