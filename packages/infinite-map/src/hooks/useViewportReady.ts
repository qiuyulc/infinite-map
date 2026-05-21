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
  origin?: 'center' | 'top-left';
  engineStore: EngineStore;
  viewport: { w: number; h: number };
  viewportRef: React.MutableRefObject<{ w: number; h: number }>;
  cameraRef: React.MutableRefObject<Camera>;
};

export function useViewportReady({
  onReady,
  origin,
  engineStore,
  viewport,
  viewportRef,
  cameraRef,
}: Params) {
  const onReadyFiredRef = useRef(false);

  // onReady：viewport 首次就绪时触发一次
  useEffect(() => {
    engineStore.getState().setViewport(viewport);
    if (!onReadyFiredRef.current && onReady && viewport.w > 0 && viewport.h > 0) {
      onReadyFiredRef.current = true;
      onReady({
        getCamera: () => cameraRef.current,
        setCamera: (next) => engineStore.getState().setView(next),
        moveOriginToTopLeft: () => engineStore.getState().setView(
          cameraForTopLeftOrigin(viewportRef.current, cameraRef.current.zoom)
        ),
        getContainerTopLeft: () => {
          const cam = cameraRef.current;
          const vp = viewportRef.current;
          const z = cam.zoom || 1;
          return { x: cam.x - vp.w / (2 * z), y: cam.y - vp.h / (2 * z) };
        },
      });
    }
  }, [engineStore, viewport, onReady, viewportRef, cameraRef]);

  // origin='top-left'：viewport 变化时自动跟随
  useEffect(() => {
    if (origin === 'top-left' && viewport.w > 0 && viewport.h > 0) {
      const cam = engineStore.getState().view;
      engineStore.getState().setView(cameraForTopLeftOrigin(viewport, cam.zoom));
    }
  }, [engineStore, viewport, origin]);
}
