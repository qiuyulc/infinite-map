import { memo, useSyncExternalStore, type ReactNode } from 'react';
import { STORE_KEYS } from '../editor/keys';
import type { Store } from '../editor/types';

type Props = {
  store: Store;
  zIndex?: number;
  children: ReactNode;
};

/**
 * ViewportLayer（参考 react-flow 的 Viewport）
 * - 只订阅 viewTransform
 * - 通过 transform 移动/缩放整张“世界层”
 * - 子组件只要 memo 得当，就不会因为 pan 每帧重渲染
 */
export const ViewportLayer = memo(function ViewportLayer({ store, zIndex = 1, children }: Props) {
  const transform = useSyncExternalStore(
    (listener) => store.subscribe(STORE_KEYS.viewTransform, listener),
    () => store.get<string>(STORE_KEYS.viewTransform) ?? 'translate3d(0px, 0px, 0) scale(1)'
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        transformOrigin: '0 0',
        transform,
        willChange: 'transform',
        width: 0,
        height: 0,
        zIndex,
      }}
    >
      {children}
    </div>
  );
});

