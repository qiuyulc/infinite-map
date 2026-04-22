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

  const commitCamera = (next: Camera, immediate = false) => {
    // 同步更新 ref：给 Canvas/事件处理用
    cameraRef.current = next;

    if (immediate) {
      if (cameraRafRef.current != null) {
        cancelAnimationFrame(cameraRafRef.current);
        cameraRafRef.current = null;
      }
      pendingCameraRef.current = null;
      setCamera(next);
      return;
    }

    pendingCameraRef.current = next;
    if (cameraRafRef.current != null) return;
    cameraRafRef.current = requestAnimationFrame(() => {
      cameraRafRef.current = null;
      const c = pendingCameraRef.current;
      if (c) setCamera(c);
    });
  };

  useEffect(() => {
    return () => {
      if (cameraRafRef.current != null) cancelAnimationFrame(cameraRafRef.current);
    };
  }, []);

  return { camera, cameraRef, commitCamera, setCamera };
}

