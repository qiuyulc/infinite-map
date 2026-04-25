import { useCallback } from 'react';
import type { Camera } from '../core/types';
import type { Point } from '../editor/types';

/**
 * 坐标换算（基于 cameraRef 的最新值）：
 * - screen: 相对画布容器左上角的像素坐标
 * - world: 无限画布的世界坐标
 */
export function useCoordinateTransforms(cameraRef: React.MutableRefObject<Camera>) {
  const screenToWorld = useCallback(
    (p: Point) => {
      const z = cameraRef.current.zoom || 1;
      return { x: cameraRef.current.x + p.x / z, y: cameraRef.current.y + p.y / z };
    },
    [cameraRef]
  );

  const worldToScreen = useCallback(
    (p: Point) => {
      const cam = cameraRef.current;
      const z = cam.zoom || 1;
      return { x: (p.x - cam.x) * z, y: (p.y - cam.y) * z };
    },
    [cameraRef]
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

