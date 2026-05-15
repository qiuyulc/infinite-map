import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Camera } from '../core/types';
import { clamp } from '../core/utils';

type Params = {
  containerRef: RefObject<HTMLElement | null>;
  cameraRef: MutableRefObject<Camera>;
  viewportRef: MutableRefObject<{ w: number; h: number }>;
  commitCamera: (next: Camera, immediate?: boolean) => void;
  /**
   * 是否允许平移（trackpad 两指平移 / 触控板滚动的 pan 分支）
   * - false：不处理“pan wheel”，并允许浏览器默认滚动（若存在）
   */
  panEnabled?: boolean;
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
  pinchZoomFactor: number;
  /**
   * 可选：wheel 事件拦截（用于插件系统）
   * - 返回 'stop'：不执行默认 wheel 行为
   * - 返回 'continue' / undefined：继续执行默认 wheel 行为
   */
  onWheelIntercept?: (e: WheelEvent, info: { sx: number; sy: number }) => 'stop' | 'continue' | undefined;
};

/**
 * wheel / trackpad 控制：
 * - pinch(ctrlKey=true) => zoom
 * - mouse wheel(deltaMode!=0) => zoom
 * - trackpad two-finger pan(deltaMode=0) => pan
 */
export function useWheelControls({
  containerRef,
  cameraRef,
  viewportRef,
  commitCamera,
  panEnabled = true,
  minZoom,
  maxZoom,
  zoomSpeed,
  pinchZoomFactor,
  onWheelIntercept,
}: Params) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;

      const intercept = onWheelIntercept?.(e, { sx, sy });
      if (intercept === 'stop') {
        e.preventDefault();
        return;
      }

      const dx = e.deltaX;
      const dy = e.deltaY;
      const isPinch = e.ctrlKey === true;

      const looksLikeMouseWheel = e.deltaMode === 1 || e.deltaMode === 2;
      const shouldZoom = isPinch || looksLikeMouseWheel;

      const cam = cameraRef.current;
      if (shouldZoom) {
        e.preventDefault();
        const pinchFactor = isPinch ? pinchZoomFactor : 1;
        const limitedDy = clamp(dy, -240, 240);

        const vp = viewportRef.current;
        const vpCx = vp.w / 2;
        const vpCy = vp.h / 2;

        const wx = cam.x + (sx - vpCx) / cam.zoom;
        const wy = cam.y + (sy - vpCy) / cam.zoom;

        const zoomFactor = Math.exp(-limitedDy * zoomSpeed * pinchFactor);
        const nextZoom = clamp(cam.zoom * zoomFactor, minZoom, maxZoom);
        const nextX = wx - (sx - vpCx) / nextZoom;
        const nextY = wy - (sy - vpCy) / nextZoom;
        commitCamera({ x: nextX, y: nextY, zoom: nextZoom }, true);
      } else {
        // 视图拖动锁：不处理 trackpad 两指平移，并允许浏览器默认滚动
        if (!panEnabled) return;
        e.preventDefault();
        const nextX = cam.x + dx / cam.zoom;
        const nextY = cam.y + dy / cam.zoom;
        // 关键：触摸板两指平移的 wheel 频率可能远高于屏幕刷新率。
        // 节点多时如果每个 wheel 都立即 setState，会造成“抖动/卡顿”。
        // 这里改为 rAF 合并（每帧最多更新一次），但 cameraRef 仍会同步更新，交互不会丢手感。
        commitCamera({ x: nextX, y: nextY, zoom: cam.zoom }, false);
      }
    };

    const preventGesture = (e: Event) => e.preventDefault();

    el.addEventListener('wheel', onWheel, { passive: false });

    el.addEventListener('gesturestart', preventGesture, { passive: false });

    el.addEventListener('gesturechange', preventGesture, { passive: false });

    el.addEventListener('gestureend', preventGesture, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);

      el.removeEventListener('gesturestart', preventGesture);

      el.removeEventListener('gesturechange', preventGesture);

      el.removeEventListener('gestureend', preventGesture);
    };
  }, [
    containerRef,
    cameraRef,
    viewportRef,
    commitCamera,
    panEnabled,
    maxZoom,
    minZoom,
    onWheelIntercept,
    pinchZoomFactor,
    zoomSpeed,
  ]);
}
