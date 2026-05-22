import { useEffect, useRef } from 'react';
import type { Camera } from '../core/types';
import { cameraForTopLeftOrigin } from '../core/utils';
import type { EngineStore } from '../engine';

type MinimalApi = {
  getCamera: () => Camera;
  setCamera: (next: Camera) => void;
  moveOriginToTopLeft: () => void;
  getContainerTopLeft: () => { x: number; y: number };
};

type Params = {
  onReady?: (api: MinimalApi) => void;
  onCameraChange?: (camera: Camera) => void;
  onViewportResize?: (viewport: { w: number; h: number }) => void;
  onDestroy?: () => void;
  engineStore: EngineStore;
  viewport: { w: number; h: number };
  viewportRef: React.MutableRefObject<{ w: number; h: number }>;
  cameraRef: React.MutableRefObject<Camera>;
};

export function useLifecycleCallbacks({
  onReady,
  onCameraChange,
  onViewportResize,
  onDestroy,
  engineStore,
  viewport,
  viewportRef,
  cameraRef,
}: Params) {
  const onReadyFiredRef = useRef(false);
  const prevViewportRef = useRef(viewport);
  const onDestroyRef = useRef(onDestroy);
  onDestroyRef.current = onDestroy;

  // onReady：viewport 首次就绪
  useEffect(() => {
    engineStore.getState().setViewport(viewport);
    if (!onReadyFiredRef.current && onReady && viewport.w > 0 && viewport.h > 0) {
      onReadyFiredRef.current = true;
      onReady({
        getCamera: () => cameraRef.current,
        setCamera: (next) => engineStore.getState().setView(next),
        moveOriginToTopLeft: () => {
          const next = cameraForTopLeftOrigin(viewportRef.current, cameraRef.current.zoom);
          cameraRef.current = next;
          engineStore.getState().setView(next);
        },
        getContainerTopLeft: () => {
          const cam = cameraRef.current;
          const vp = viewportRef.current;
          const z = cam.zoom || 1;
          return { x: cam.x - vp.w / (2 * z), y: cam.y - vp.h / (2 * z) };
        },
      });
    }
  }, [engineStore, viewport, onReady, viewportRef, cameraRef]);

  // onCameraChange：订阅 engine store 的 view 变化
  useEffect(() => {
    if (!onCameraChange) return;
    const unsub = engineStore.subscribe(
      (s) => s.view,
      (view) => {
        const cam = view as Camera;
        onCameraChange({ x: cam.x, y: cam.y, zoom: cam.zoom || 1 });
      },
      { equalityFn: (a: Camera, b: Camera) => a.x === b.x && a.y === b.y && a.zoom === b.zoom }
    );
    return unsub;
  }, [engineStore, onCameraChange]);

  // onViewportResize：viewport 变化时回调
  useEffect(() => {
    if (!onViewportResize) return;
    const prev = prevViewportRef.current;
    if (prev.w !== viewport.w || prev.h !== viewport.h) {
      prevViewportRef.current = viewport;
      if (viewport.w > 0 && viewport.h > 0) {
        onViewportResize(viewport);
      }
    }
  }, [viewport, onViewportResize]);

  // onDestroy：组件卸载
  useEffect(() => {
    return () => {
      onDestroyRef.current?.();
    };
  }, []);
}
