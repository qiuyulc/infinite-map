import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';
import { composePlugins } from './editor/composePlugins';
import type { DefaultEditorOptions } from './editor/createDefaultEditorPlugins';
import { createDefaultEditorPlugins } from './editor/createDefaultEditorPlugins';

import { createMinimapPlugin } from './editor/plugins/hud/createMinimapPlugin';
import { createRulersPlugin } from './editor/plugins/hud/createRulersPlugin';
import { createZoomDockPlugin } from './editor/plugins/hud/createZoomDockPlugin';
import { createToolbarPlugin } from './editor/plugins/hud/createToolbarPlugin';
import { createDefaultContextMenuPlugin } from './editor/plugins/hud/createDefaultContextMenuPlugin';
import { createMarqueeSelectPlugin } from './editor/plugins/selection/createMarqueeSelectPlugin';

export type DefaultEditorWithUIOptions = DefaultEditorOptions & {
  /** 标尺（顶部/左侧） */
  rulersEnabled?: boolean;
  /** minimap（右下角） */
  minimapEnabled?: boolean;
  /**
   * 默认工具栏（hud）
   * - 默认 false：避免 UI 污染；需要时由用户显式开启
   */
  toolbarEnabled?: boolean;
  /**
   * 缩放滑杆（hud）
   * - 默认 true：这是编辑器常用能力；且不会像 toolbar 那样“占视线”
   */
  zoomDockEnabled?: boolean;
  /**
   * 默认右键菜单（hud）
   * - 默认 false：避免 UI 污染；需要时由用户显式开启
   */
  contextMenuEnabled?: boolean;
};

/**
 * 默认编辑器插件集合（带 UI）
 * - core 插件来自 createDefaultEditorPlugins（但会延后插入 marquee，保证 marquee 永远在末尾）
 * - HUD/UI 插件：toolbar / zoomDock / contextMenu / rulers / minimap
 */
export function createDefaultEditorPluginsWithUI(opts: DefaultEditorWithUIOptions = {}): InfiniteMapPlugin[] {
  const marqueeEnabled = opts.marqueeEnabled ?? true;
  const marqueeRequireShift = opts.marqueeRequireShift ?? false;

  // 先构造 core，但暂时不加 marquee，避免 UI 插件被插在 marquee 后面
  const core = createDefaultEditorPlugins({ ...opts, marqueeEnabled: false });
  const out: InfiniteMapPlugin[] = [...core];

  const toolbarEnabled = opts.toolbarEnabled ?? false;
  const zoomDockEnabled = opts.zoomDockEnabled ?? true;
  const contextMenuEnabled = opts.contextMenuEnabled ?? false;
  const rulersEnabled = opts.rulersEnabled ?? true;
  const minimapEnabled = opts.minimapEnabled ?? true;

  if (toolbarEnabled) out.push(createToolbarPlugin());
  if (zoomDockEnabled) out.push(createZoomDockPlugin());
  if (contextMenuEnabled) out.push(createDefaultContextMenuPlugin());
  if (rulersEnabled) out.push(createRulersPlugin());
  if (minimapEnabled) out.push(createMinimapPlugin());

  if (marqueeEnabled) out.push(createMarqueeSelectPlugin({ requireShift: marqueeRequireShift }));

  return composePlugins(out);
}

