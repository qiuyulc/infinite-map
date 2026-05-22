import { useEffect } from 'react';
import type { Camera } from '../core/types';
import { cameraForTopLeftOrigin } from '../core/utils';
import type { EngineStore } from '../engine';

type Params = {
  origin?: 'center' | 'top-left';
  engineStore: EngineStore;
  viewport: { w: number; h: number };
  cameraRef: React.MutableRefObject<Camera>;
};

/**
 * origin='top-left' 时 viewport 变化自动跟随
 */
export function useOriginSync({ origin, engineStore, viewport, cameraRef }: Params) {
  useEffect(() => {
    if (origin === 'top-left' && viewport.w > 0 && viewport.h > 0) {
      const cam = engineStore.getState().view as Camera;
      const next = cameraForTopLeftOrigin(viewport, cam.zoom);
      cameraRef.current = next;
      engineStore.getState().setView(next);
    }
  }, [engineStore, viewport, origin, cameraRef]);
}
