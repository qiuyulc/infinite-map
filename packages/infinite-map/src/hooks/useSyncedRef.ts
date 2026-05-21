import { useEffect, useRef } from 'react';

/**
 * ref 与值保持同步——每次渲染自动更新 ref.current
 * 消除样板代码：useRef + useEffect(() => { ref.current = val }, [val])
 */
export function useSyncedRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
