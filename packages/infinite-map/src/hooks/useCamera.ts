import { useEffect, useRef, useState } from 'react';
import type { Camera } from '../core/types';

/**
 * 相机状态（x/y/zoom）与“提交策略”
 * - immediate=true：立即 setState（更跟手，用于 wheel/drag）
 * - immediate=false：rAF 合并（减少重渲染）
 */
export function useCamera(initialCamera: Camera) {
  const [camera, setCamera] = useState<Camera>(initialCamera);

  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const pendingCameraRef = useRef<Camera | null>(null);
  const cameraRafRef = useRef<number | null>(null);
  const lastCommitTsRef = useRef(0);

  type CommitOptions =
    | boolean
    | {
        /**
         * true：立即 setState（更跟手）
         * false/undefined：合并/节流后 setState
         */
        immediate?: boolean;
        /**
         * setState 的最小间隔（ms）
         * - 用于 pan（拖地图）时降低 React 重渲染频率
         * - 注意：cameraRef 会始终同步更新；只有 React state 被节流
         */
        throttleMs?: number;
      };

  const commitCamera = (next: Camera, opts: CommitOptions = false) => {
    const immediate = typeof opts === 'boolean' ? opts : Boolean(opts.immediate);
    const throttleMs = typeof opts === 'boolean' ? undefined : opts.throttleMs;

    // 同步更新 ref：给 Canvas/事件处理用
    cameraRef.current = next;

    if (immediate) {
      if (cameraRafRef.current != null) {
        cancelAnimationFrame(cameraRafRef.current);
        cameraRafRef.current = null;
      }
      pendingCameraRef.current = null;
      lastCommitTsRef.current = 0;
      setCamera(next);
      return;
    }

    pendingCameraRef.current = next;
    if (cameraRafRef.current != null) return;
    cameraRafRef.current = requestAnimationFrame(() => {
      const now = (globalThis as any).performance?.now ? (globalThis as any).performance.now() : Date.now();
      const canCommit =
        throttleMs == null || lastCommitTsRef.current === 0 || now - lastCommitTsRef.current >= throttleMs;
      if (canCommit) {
        cameraRafRef.current = null;
        const c = pendingCameraRef.current;
        if (c) {
          lastCommitTsRef.current = now;
          setCamera(c);
        }
        return;
      }
      // 未到节流窗口：继续下一帧再试（保持 rAF loop）
      cameraRafRef.current = requestAnimationFrame(() => {
        cameraRafRef.current = null;
        const now2 = (globalThis as any).performance?.now ? (globalThis as any).performance.now() : Date.now();
        const c2 = pendingCameraRef.current;
        if (!c2) return;
        if (now2 - lastCommitTsRef.current >= (throttleMs ?? 0)) {
          lastCommitTsRef.current = now2;
          setCamera(c2);
        }
      });
    });
  };

  useEffect(() => {
    return () => {
      if (cameraRafRef.current != null) cancelAnimationFrame(cameraRafRef.current);
    };
  }, []);

  return { camera, cameraRef, commitCamera, setCamera };
}
