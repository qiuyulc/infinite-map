import type { InfiniteMapPlugin } from '../../types';
import { STORE_KEYS } from '../../keys';

export type KeyboardStatePluginOptions = {
  /**
   * store key for space pressed state
   */
  spaceKey?: string;
};

const DEFAULT_SPACE_KEY = STORE_KEYS.keyboardSpace;

export function createKeyboardStatePlugin(opts: KeyboardStatePluginOptions = {}): InfiniteMapPlugin {
  const spaceKey = opts.spaceKey ?? DEFAULT_SPACE_KEY;

  return {
    id: 'keyboard-state',
    handlers: {
      onKeyDown: (e, ctx) => {
        if (e.code === 'Space') {
          ctx.store.set(spaceKey, true);
          ctx.requestRender();
          // stop：避免浏览器滚动页面
          return { handled: true };
        }
        return { handled: false };
      },
      onKeyUp: (e, ctx) => {
        if (e.code === 'Space') {
          ctx.store.set(spaceKey, false);
          ctx.requestRender();
          return { handled: true };
        }
        return { handled: false };
      },
    },
  };
}

