import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';
import { composePlugins } from './composePlugins';
import {
  createDragPlugin,
  createCommandRunnerPlugin,
  createCoreServicesPlugin,
  createClipboardPlugin,
  createHistoryPlugin,
  createKeyboardStatePlugin,
  createMarqueeSelectPlugin,
  createShortcutsPlugin,
  createSnapGuidesPlugin,
  createViewCommandsPlugin,
  createZIndexPlugin,
  createRotate3DPlugin,
  createRotatePlugin,
  createResizePlugin,
  createSelectionPlugin,
  createGroupPlugin,
  createLockHidePlugin,
} from './plugins';

export type DefaultEditorOptions = {
  /** 空白拖拽是否框选 */
  marqueeEnabled?: boolean;
  /**
   * 是否需要按住 Shift 才能框选
   * - false：空白拖拽默认框选（配合 Space+拖拽平移）
   * - true：Shift+空白拖拽才框选（空白拖拽默认平移）
   */
  marqueeRequireShift?: boolean;

  /** 剪贴板能力（删除/复制/剪切/粘贴/重复） */
  clipboardEnabled?: boolean;

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
  const clipboardEnabled = opts.clipboardEnabled ?? true;
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
    // group service + group/ungroup commands
    createGroupPlugin(),
    // lock/hide commands + hud entries
    createLockHidePlugin(),
    createSelectionPlugin(),
    ...(clipboardEnabled ? [createClipboardPlugin()] : []),
    createRotatePlugin(),
    createResizePlugin(),
    createDragPlugin(),
  ];

  if (marqueeEnabled) {
    plugins.push(createMarqueeSelectPlugin({ requireShift: marqueeRequireShift }));
  }

  return composePlugins(plugins);
}

