import { useSyncExternalStore } from 'react';
import type { EngineStore } from './engineStore';

/**
 * 在 React 中以 “selector + equalityFn” 的方式订阅 zustand/vanilla store。
 * - 用于低频/结构性渲染（例如 visibleNodeIds 变化时重新 mount/unmount）
 * - 禁止用于高频字段（如 view/camera）以免拖拽时产生 Fiber 任务
 */
export function useEngineSelector<T>(
  store: EngineStore,
  selector: (s: ReturnType<EngineStore['getState']>) => T,
  equalityFn: (a: T, b: T) => boolean
): T {
  return useSyncExternalStore(
    (listener) => store.subscribe(selector, () => listener(), { equalityFn }),
    () => selector(store.getState())
  );
}

