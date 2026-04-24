import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';
import { composePlugins } from './editor/composePlugins';
import type { DefaultEditorOptions } from './editor/createDefaultEditorPlugins';
import { createDefaultEditorPlugins } from './editor/createDefaultEditorPlugins';

import {
  type DefaultContextMenuOptions,
  createDefaultContextMenuPlugin,
  type MarqueeSelectPluginOptions,
  createMarqueeSelectPlugin,
  type MinimapPluginOptions,
  createMinimapPlugin,
  type RulersPluginOptions,
  createRulersPlugin,
  type ToolbarPluginOptions,
  createToolbarPlugin,
  type ZoomDockPluginOptions,
  createZoomDockPlugin,
} from './plugins';

export type DefaultEditorWithUIOptions = DefaultEditorOptions & {
  /**
   * @deprecated 请改用 `rulers`（或 `rulersEnabled` 仅作为开关）
   */
  rulersEnabled?: boolean;
  /**
   * @deprecated 请改用 `minimap`（或 `minimapEnabled` 仅作为开关）
   */
  minimapEnabled?: boolean;
  /**
   * @deprecated 请改用 `toolbar`（或 `toolbarEnabled` 仅作为开关）
   */
  toolbarEnabled?: boolean;
  /**
   * @deprecated 请改用 `zoomDock`（或 `zoomDockEnabled` 仅作为开关）
   */
  zoomDockEnabled?: boolean;
  /**
   * @deprecated 请改用 `contextMenu`（或 `contextMenuEnabled` 仅作为开关）
   */
  contextMenuEnabled?: boolean;

  /**
   * HUD/UI 插件配置（按插件名分组）
   * - enabled：是否挂载该 HUD 插件（不挂载 = 连 overlay 都不会创建）
   */
  toolbar?: ToolbarPluginOptions & { enabled?: boolean };
  zoomDock?: ZoomDockPluginOptions & { enabled?: boolean };
  contextMenu?: DefaultContextMenuOptions & { enabled?: boolean };
  minimap?: MinimapPluginOptions & { enabled?: boolean };
  rulers?: RulersPluginOptions & { enabled?: boolean };

  /**
   * marquee（框选）在“带 UI 默认组装”里依然会强制放最后
   * - 这里允许你覆盖 marquee 的细节参数（storeKey/minDragPx 等）
   */
  marquee?: MarqueeSelectPluginOptions & { enabled?: boolean };
};

/**
 * 默认编辑器插件集合（带 UI）
 * - core 插件来自 createDefaultEditorPlugins（但会延后插入 marquee，保证 marquee 永远在末尾）
 * - HUD/UI 插件：toolbar / zoomDock / contextMenu / rulers / minimap
 */
export function createDefaultEditorPluginsWithUI(opts: DefaultEditorWithUIOptions = {}): InfiniteMapPlugin[] {
  const marqueeEnabled = opts.marquee?.enabled ?? opts.marqueeEnabled ?? true;
  const marqueeRequireShift = opts.marquee?.requireShift ?? opts.marqueeRequireShift ?? false;

  // 先构造 core，但暂时不加 marquee，避免 UI 插件被插在 marquee 后面
  const core = createDefaultEditorPlugins({ ...opts, marqueeEnabled: false });
  const out: InfiniteMapPlugin[] = [...core];

  const toolbarEnabled = opts.toolbar?.enabled ?? opts.toolbarEnabled ?? false;
  const zoomDockEnabled = opts.zoomDock?.enabled ?? opts.zoomDockEnabled ?? true;
  const contextMenuEnabled = opts.contextMenu?.enabled ?? opts.contextMenuEnabled ?? false;
  const rulersEnabled = opts.rulers?.enabled ?? opts.rulersEnabled ?? true;
  const minimapEnabled = opts.minimap?.enabled ?? opts.minimapEnabled ?? true;

  if (toolbarEnabled) {
    const { enabled: _enabled, ...toolbar } = opts.toolbar ?? {};
    out.push(createToolbarPlugin(toolbar));
  }
  if (zoomDockEnabled) {
    const { enabled: _enabled, ...zoomDock } = opts.zoomDock ?? {};
    out.push(createZoomDockPlugin(zoomDock));
  }
  if (contextMenuEnabled) {
    const { enabled: _enabled, ...contextMenu } = opts.contextMenu ?? {};
    out.push(createDefaultContextMenuPlugin(contextMenu));
  }
  if (rulersEnabled) {
    const { enabled: _enabled, ...rulers } = opts.rulers ?? {};
    out.push(createRulersPlugin(rulers));
  }
  if (minimapEnabled) {
    const { enabled: _enabled, ...minimap } = opts.minimap ?? {};
    out.push(createMinimapPlugin(minimap));
  }

  if (marqueeEnabled) {
    const { enabled: _enabled, ...marquee } = opts.marquee ?? {};
    out.push(createMarqueeSelectPlugin({ ...marquee, requireShift: marqueeRequireShift }));
  }

  return composePlugins(out);
}
