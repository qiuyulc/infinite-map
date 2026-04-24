import type { InfiniteMapPlugin } from '../../types';
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
    overlayPointerEvents: 'none',
    overlay: ({ ctx }) => <RulersOverlay ctx={ctx} thickness={thickness} />,
  };
}
