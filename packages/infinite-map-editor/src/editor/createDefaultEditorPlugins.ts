import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';
import { composePlugins } from './composePlugins';
import {
  type ClipboardPluginOptions,
  createDragPlugin,
  createCommandRunnerPlugin,
  createCoreServicesPlugin,
  createClipboardPlugin,
  type DragPluginOptions,
  createHistoryPlugin,
  createKeyboardStatePlugin,
  type KeyboardStatePluginOptions,
  createMarqueeSelectPlugin,
  type MarqueeSelectPluginOptions,
  createShortcutsPlugin,
  createSnapGuidesPlugin,
  type SnapGuidesPluginOptions,
  createViewCommandsPlugin,
  type ViewCommandsPluginOptions,
  createZIndexPlugin,
  createRotate3DPlugin,
  createRotatePlugin,
  createResizePlugin,
  type ResizePluginOptions,
  createSelectionPlugin,
  type SelectionPluginOptions,
  createGroupPlugin,
  createLockHidePlugin,
  type ShortcutsPluginOptions,
  type HistoryPluginOptions,
} from '../plugins';

export type DefaultEditorOptions = {
  /**
   * 框选插件（marquee）
   */
  marquee?: MarqueeSelectPluginOptions & { enabled?: boolean };

  /**
   * 剪贴板插件（copy/cut/paste/duplicate/delete）
   */
  clipboard?: ClipboardPluginOptions & { enabled?: boolean };

  /**
   * 快捷键插件配置（建议使用 commandShortcuts 覆盖默认快捷键）
   */
  shortcuts?: ShortcutsPluginOptions;

  /**
   * snapping + guides 配置
   */
  snap?: SnapGuidesPluginOptions;

  /**
   * 视图命令（zoom/fit/center）配置
   * - 注意：minZoom/maxZoom 也由这里写入 STORE_KEYS.viewConfig（供 zoomDock / view 命令共用）
   */
  view?: ViewCommandsPluginOptions;

  /**
   * 选择/拖拽/缩放等基础交互插件的可选参数
   */
  selection?: SelectionPluginOptions;
  drag?: DragPluginOptions;
  resize?: ResizePluginOptions;
  keyboardState?: KeyboardStatePluginOptions;

  /**
   * 历史记录（undo/redo）配置
   */
  history?: HistoryPluginOptions;
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
  const marqueeEnabled = opts.marquee?.enabled ?? true;
  const marqueeRequireShift = opts.marquee?.requireShift ?? false;
  const clipboardEnabled = opts.clipboard?.enabled ?? true;

  // 默认 snapping 参数：保持与当前行为一致（grid=48）
  const defaultSnap: SnapGuidesPluginOptions = { enabled: true, gridSize: 48, thresholdPx: 6 };
  const snap = { ...defaultSnap, ...(opts.snap ?? {}) } satisfies SnapGuidesPluginOptions;

  const view = opts.view ?? {};

  const plugins: InfiniteMapPlugin[] = [
    createKeyboardStatePlugin(opts.keyboardState),
    createCoreServicesPlugin(),
    createCommandRunnerPlugin(),
    createShortcutsPlugin(opts.shortcuts),
    createHistoryPlugin(opts.history),
    createViewCommandsPlugin(view),
    createZIndexPlugin(),
    // snapping + guides（drag/resize 会读 snap:config 并写 snap:guides）
    createSnapGuidesPlugin(snap),
    // Alt/Option + 拖拽：3D 旋转（需优先于 selection/drag/marquee）
    createRotate3DPlugin(),
    // group service + group/ungroup commands
    createGroupPlugin(),
    // lock/hide commands + hud entries
    createLockHidePlugin(),
    createSelectionPlugin(opts.selection),
    ...(clipboardEnabled ? [createClipboardPlugin(opts.clipboard)] : []),
    createRotatePlugin(),
    createResizePlugin(opts.resize),
    createDragPlugin(opts.drag),
  ];

  if (marqueeEnabled) {
    const { enabled: _enabled, ...marqueeOpts } = opts.marquee ?? {};
    plugins.push(createMarqueeSelectPlugin({ ...marqueeOpts, requireShift: marqueeRequireShift }));
  }

  return composePlugins(plugins);
}
