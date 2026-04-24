import { STORE_KEYS, type InfiniteMapPlugin } from '@qiuyulc/infinite-map';
import { SnapGuidesOverlay } from './SnapGuidesOverlay';

export type SnapConfig = {
  enabled: boolean;
  gridSize: number | 'auto'; // world units（auto 会随 zoom 自适应）
  thresholdPx: number; // screen px
  /**
   * 当 gridSize='auto' 时使用：目标网格像素间距（用于反推世界步长）
   */
  gridTargetPx?: number;
};

export type SnapGuidesPluginOptions = Partial<SnapConfig>;

const DEFAULT_CONFIG: SnapConfig = { enabled: true, gridSize: 'auto', thresholdPx: 6, gridTargetPx: 84 };

export function createSnapGuidesPlugin(opts: SnapGuidesPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'snap-guides',
    overlay: SnapGuidesOverlay,
    setup: (ctx) => {
      const prev = ctx.store.get<SnapConfig>(STORE_KEYS.snapConfig);
      if (prev) return;
      ctx.store.set(STORE_KEYS.snapConfig, { ...DEFAULT_CONFIG, ...opts });
    },
  };
}
