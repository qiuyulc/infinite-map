import { useCallback } from 'react';
import type { Camera } from '../core/types';
import type { Point } from '../editor/types';

/**
 * 坐标换算（基于 cameraRef 的最新值）：
 * - screen: 相对画布容器左上角的像素坐标
 * - world: 无限画布的世界坐标（原点位于视口中心）
 */
export function useCoordinateTransforms(
  cameraRef: React.MutableRefObject<Camera>,
  viewportRef: React.MutableRefObject<{ w: number; h: number }>
) {
  const screenToWorld = useCallback(
    (p: Point) => {
      const z = cameraRef.current.zoom || 1;
      const vp = viewportRef.current;
      return { x: cameraRef.current.x + (p.x - vp.w / 2) / z, y: cameraRef.current.y + (p.y - vp.h / 2) / z };
    },
    [cameraRef, viewportRef]
  );

  const worldToScreen = useCallback(
    (p: Point) => {
      const cam = cameraRef.current;
      const z = cam.zoom || 1;
      const vp = viewportRef.current;
      return { x: (p.x - cam.x) * z + vp.w / 2, y: (p.y - cam.y) * z + vp.h / 2 };
    },
    [cameraRef, viewportRef]
  );

  const rectScreenToWorld = useCallback(
    (r: { x: number; y: number; w: number; h: number }) => {
      const p0 = screenToWorld({ x: r.x, y: r.y });
      const p1 = screenToWorld({ x: r.x + r.w, y: r.y + r.h });
      return { x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y };
    },
    [screenToWorld]
  );

  const rectWorldToScreen = useCallback(
    (r: { x: number; y: number; w: number; h: number }) => {
      const p0 = worldToScreen({ x: r.x, y: r.y });
      const p1 = worldToScreen({ x: r.x + r.w, y: r.y + r.h });
      return { x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y };
    },
    [worldToScreen]
  );

  return { screenToWorld, worldToScreen, rectScreenToWorld, rectWorldToScreen };
}

