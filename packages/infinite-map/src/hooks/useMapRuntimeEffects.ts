import { useEffect } from 'react';
import type { Camera } from '../core/types';
import type { InfiniteMapPlugin, MapContext, MapWheelEvent } from '../editor/types';
import { useWheelControls } from './useWheelControls';

export function useMapRuntimeEffects({
  plugins,
  ctx,
  containerRef,
  cameraRef,
  viewportRef,
  commitCamera,
  panEnabled,
  minZoom,
  maxZoom,
  zoomSpeed,
  pinchZoomFactor,
  screenToWorld,
  bus,
}: {
  plugins?: InfiniteMapPlugin[];
  ctx: MapContext;
  containerRef: { current: HTMLElement | null };
  cameraRef: React.MutableRefObject<Camera>;
  viewportRef: React.MutableRefObject<{ w: number; h: number }>;
  commitCamera: (next: Camera, immediate?: boolean) => void;
  panEnabled: boolean;
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
  pinchZoomFactor: number;
  screenToWorld: (p: { x: number; y: number }) => { x: number; y: number };
  bus: { on: (type: 'camera:set', handler: (p: { camera: Camera; immediate?: boolean }) => void) => () => void };
}) {
  useWheelControls({
    containerRef: containerRef as any,
    cameraRef,
    viewportRef,
    commitCamera,
    panEnabled,
    minZoom,
    maxZoom,
    zoomSpeed,
    pinchZoomFactor,
    onWheelIntercept: (e, info) => {
      if (!plugins || plugins.length === 0) return undefined;
      const m: MapWheelEvent = {
        screen: { x: info.sx, y: info.sy },
        world: screenToWorld({ x: info.sx, y: info.sy }),
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        ctrlKey: e.ctrlKey === true,
        modifiers: { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey },
        originalEvent: e,
      };
      let sawContinue = false;
      for (const p of plugins) {
        if (p.enabled === false) continue;
        const res = p.input?.onWheel?.(m, ctx);
        if (!res || res.handled === false) continue;
        if (res.mode === 'continue') {
          sawContinue = true;
          continue;
        }
        return 'stop';
      }
      return sawContinue ? 'continue' : undefined;
    },
  });

  // camera 变更事件：允许插件（如 minimap）驱动相机
  useEffect(() => {
    return bus.on('camera:set', ({ camera: next, immediate }) => {
      commitCamera(next, Boolean(immediate));
    });
  }, [bus, commitCamera]);
}
