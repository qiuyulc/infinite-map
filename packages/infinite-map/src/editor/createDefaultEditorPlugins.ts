import type { InfiniteMapPlugin } from './types';
import { composePlugins } from './composePlugins';
import {
  createDragPlugin,
  createCommandRunnerPlugin,
  createCoreServicesPlugin,
  createClipboardPlugin,
  createHistoryPlugin,
  createKeyboardStatePlugin,
  createMarqueeSelectPlugin,
  createMinimapPlugin,
  createRulersPlugin,
  createShortcutsPlugin,
  createSnapGuidesPlugin,
  createViewCommandsPlugin,
  createZoomDockPlugin,
  createZIndexPlugin,
  createToolbarPlugin,
  createDefaultContextMenuPlugin,
  createRotate3DPlugin,
  createRotatePlugin,
  createResizePlugin,
  createSelectionPlugin,
} from './plugins';

export type DefaultEditorOptions = {
  /**
   * 空白拖拽是否框选
   */
  marqueeEnabled?: boolean;
  /**
   * 是否需要按住 Shift 才能框选
   * - false：空白拖拽默认框选（配合 Space+拖拽平移）
   * - true：Shift+空白拖拽才框选（空白拖拽默认平移）
   */
  marqueeRequireShift?: boolean;

  /**
   * 标尺（顶部/左侧）
   */
  rulersEnabled?: boolean;

  /**
   * minimap（右下角）
   */
  minimapEnabled?: boolean;

  /**
   * 剪贴板能力（删除/复制/剪切/粘贴/重复）
   */
  clipboardEnabled?: boolean;

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

  /**
   * 以 commandId 为维度覆盖快捷键
   * - string：设置/覆盖
   * - null：禁用该命令默认快捷键
   */
  shortcutOverrides?: Record<string, string | null>;
};

/**
 * 默认编辑器插件集合（顺序=优先级）
 * - keyboard-state：Space 平移状态
 * - selection：点击选中 / 多选规则
 * - resize：单选 8 点缩放（需优先于 drag）
 * - drag：拖拽移动（支持多选整体移动）
 * - marquee：空白拖拽框选（放最后，避免抢占 handle/drag）
 */
export function createDefaultEditorPlugins(opts: DefaultEditorOptions = {}): InfiniteMapPlugin[] {
  const marqueeEnabled = opts.marqueeEnabled ?? true;
  const marqueeRequireShift = opts.marqueeRequireShift ?? false;
  const rulersEnabled = opts.rulersEnabled ?? true;
  const minimapEnabled = opts.minimapEnabled ?? true;
  const clipboardEnabled = opts.clipboardEnabled ?? true;
  const toolbarEnabled = opts.toolbarEnabled ?? false;
  const zoomDockEnabled = opts.zoomDockEnabled ?? true;
  const contextMenuEnabled = opts.contextMenuEnabled ?? false;
  const shortcutOverrides = opts.shortcutOverrides;

  const plugins: InfiniteMapPlugin[] = [
    createKeyboardStatePlugin(),
    createCoreServicesPlugin(),
    createCommandRunnerPlugin(),
    createShortcutsPlugin({ commandShortcuts: shortcutOverrides }),
    createHistoryPlugin(),
    createViewCommandsPlugin(),
    createZIndexPlugin(),
    // snapping + guides（drag/resize 会读 snap:config 并写 snap:guides）
    createSnapGuidesPlugin({ enabled: true, gridSize: 48, thresholdPx: 6 }),
    // Alt/Option + 拖拽：3D 旋转（需优先于 selection/drag/marquee）
    createRotate3DPlugin(),
    createSelectionPlugin(),
    ...(clipboardEnabled ? [createClipboardPlugin()] : []),
    createRotatePlugin(),
    createResizePlugin(),
    createDragPlugin(),
  ];

  if (toolbarEnabled) {
    plugins.push(createToolbarPlugin());
  }

  if (zoomDockEnabled) {
    plugins.push(createZoomDockPlugin());
  }

  if (contextMenuEnabled) {
    plugins.push(createDefaultContextMenuPlugin());
  }

  if (rulersEnabled) {
    // 放在末尾：保证 ruler 在最上层（视觉上更像编辑器）
    plugins.push(createRulersPlugin());
  }

  if (minimapEnabled) {
    plugins.push(createMinimapPlugin());
  }

  if (marqueeEnabled) {
    plugins.push(createMarqueeSelectPlugin({ requireShift: marqueeRequireShift }));
  }

  return composePlugins(plugins);
}
