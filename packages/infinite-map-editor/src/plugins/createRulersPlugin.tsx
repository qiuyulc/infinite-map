import type { InfiniteMapPlugin } from '@qiuyulc/infinite-map';
import { RulersOverlay } from './RulersOverlay';

export type RulersPluginOptions = {
  thickness?: number;
};

export function createRulersPlugin(opts: RulersPluginOptions = {}): InfiniteMapPlugin {
  const thickness = opts.thickness ?? 24;
  return {
    id: 'rulers',
    provides: ['rulers'],
    slot: 'hud',
    // 标尺需要接收 pointer events（拖拽平移/拖出参考线）
    overlayPointerEvents: 'auto',
    overlay: ({ ctx }) => <RulersOverlay ctx={ctx} thickness={thickness} />,
  };
}
