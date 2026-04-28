import { STORE_KEYS, type InfiniteMapPlugin } from '@qiuyulc/infinite-map';
import { SnapGuidesOverlay } from './SnapGuidesOverlay';

export type SnapConfig = {
  enabled: boolean;
  /**
   * 是否显示辅助线（仅影响 guides overlay 与 guides 写入，不影响吸附计算）
   */
  guidesEnabled: boolean;
  gridSize: number | 'auto'; // world units（auto 会随 zoom 自适应）
  thresholdPx: number; // screen px
  /**
   * 当 gridSize='auto' 时使用：目标网格像素间距（用于反推世界步长）
   */
  gridTargetPx?: number;
};

export type SnapGuidesPluginOptions = Partial<SnapConfig>;

const DEFAULT_CONFIG: SnapConfig = { enabled: true, guidesEnabled: true, gridSize: 'auto', thresholdPx: 6, gridTargetPx: 84 };

export function createSnapGuidesPlugin(opts: SnapGuidesPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'snap-guides',
    overlay: SnapGuidesOverlay,
    setup: (ctx) => {
      const prev = ctx.store.get<SnapConfig>(STORE_KEYS.snapConfig);
      // 注意：Playground 需要在运行期切换“吸附/辅助线”，因此这里不能只初始化一次。
      // 合并规则：
      // - DEFAULT 兜底
      // - prev 保留用户/宿主已写入的其它字段
      // - opts 覆盖（当外部传入新的 enabled/guidesEnabled 等）
      const next: SnapConfig = { ...DEFAULT_CONFIG, ...(prev ?? {}), ...(opts as any) };
      ctx.store.set(STORE_KEYS.snapConfig, next);
      // 关闭吸附或关闭辅助线：立即清空 guides，避免残留
      if (next.enabled === false || next.guidesEnabled === false) {
        ctx.store.set(STORE_KEYS.snapGuides, null);
      }
    },
  };
}
