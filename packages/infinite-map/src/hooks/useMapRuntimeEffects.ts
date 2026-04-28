import { useEffect } from 'react';
import type { Camera } from '../core/types';
import { computeAdaptiveSteps } from '../core/steps';
import { STORE_KEYS } from '../editor/keys';
import type { InfiniteMapPlugin, MapContext, MapWheelEvent } from '../editor/types';
import { useHighlightLayer } from './useHighlightLayer';
import { useWheelControls } from './useWheelControls';

export function useMapRuntimeEffects({
  plugins,
  ctx,
  containerRef,
  highlightCanvasRef,
  viewport,
  viewportRef,
  cameraRef,
  commitCamera,
  mouseRef,
  pulseRef,
  panEnabled,
  minZoom,
  maxZoom,
  zoomSpeed,
  pinchZoomFactor,
  dotSpacing,
  dotRadiusPx,
  highlightRadiusPx,
  wheelPulseStrength,
  screenToWorld,
  store,
  bus,
  minimapWidth,
  minimapHeight,
  minimapCachePadding,
  minimapNeedsRedraw,
}: {
  plugins?: InfiniteMapPlugin[];
  ctx: MapContext;
  containerRef: { current: HTMLElement | null };
  highlightCanvasRef: { current: HTMLCanvasElement | null };
  viewport: { w: number; h: number };
  viewportRef: React.MutableRefObject<{ w: number; h: number }>;
  cameraRef: React.MutableRefObject<Camera>;
  commitCamera: (next: Camera, immediate?: boolean) => void;
  mouseRef: React.MutableRefObject<{ x: number; y: number } | null>;
  pulseRef: React.MutableRefObject<{ value: number; lastTs: number }>;
  panEnabled: boolean;
  minZoom: number;
  maxZoom: number;
  zoomSpeed: number;
  pinchZoomFactor: number;
  dotSpacing: number | 'auto';
  dotRadiusPx: number;
  highlightRadiusPx: number;
  wheelPulseStrength: number;
  screenToWorld: (p: { x: number; y: number }) => { x: number; y: number };
  store: { set: (key: string, v: any) => void };
  bus: { on: (type: 'camera:change', handler: (p: { camera: Camera; immediate?: boolean }) => void) => () => void };
  minimapWidth: number;
  minimapHeight: number;
  minimapCachePadding: number;
  minimapNeedsRedraw?: unknown;
}) {
  useWheelControls({
    containerRef: containerRef as any,
    mouseRef,
    pulseRef,
    cameraRef,
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

  useHighlightLayer({
    canvasRef: highlightCanvasRef as any,
    viewport,
    viewportRef,
    cameraRef,
    mouseRef,
    pulseRef,
    dotSpacing: dotSpacing === 'auto' ? computeAdaptiveSteps(cameraRef.current.zoom || 1).minorStepWorld : dotSpacing,
    dotRadiusPx,
    highlightRadiusPx,
    wheelPulseStrength,
  });

  // minimap config（供 minimap plugin 读取）
  useEffect(() => {
    store.set(STORE_KEYS.minimapConfig, { width: minimapWidth, height: minimapHeight, cachePadding: minimapCachePadding });
    store.set(STORE_KEYS.minimapNeedsRedraw, minimapNeedsRedraw);
  }, [minimapCachePadding, minimapHeight, minimapNeedsRedraw, minimapWidth, store]);

  // camera 变更事件：允许插件（如 minimap）驱动相机
  useEffect(() => {
    return bus.on('camera:change', ({ camera: next, immediate }) => {
      commitCamera(next, Boolean(immediate));
    });
  }, [bus, commitCamera]);
}
