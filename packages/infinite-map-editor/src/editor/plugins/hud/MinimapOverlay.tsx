import { useCallback, useEffect, useRef } from 'react';
import type { Camera } from '../../../core/types';
import { Minimap } from '../../../components/Minimap';
import { useThemeVersion } from '../../../hooks/useThemeVersion';
import { STORE_KEYS } from '../../keys';
import type { MapContext } from '../../types';
import type { MinimapPluginOptions } from './createMinimapPlugin';

export function MinimapOverlay({ ctx, opts }: { ctx: MapContext; opts: MinimapPluginOptions }) {
  const themeVersion = useThemeVersion();
  const nodes = ctx.getNodes();
  const visibleCount = ctx.getVisibleNodes().length;
  const inViewCount = ctx.store.get<number>(STORE_KEYS.minimapInViewCount) ?? 0;
  const totalCount = nodes.length;
  const viewport = ctx.getViewport();

  const cfg = (ctx.store.get<{ width?: number; height?: number; cachePadding?: number }>(STORE_KEYS.minimapConfig) ?? {}) as {
    width?: number;
    height?: number;
    cachePadding?: number;
  };
  const width = opts.width ?? cfg.width ?? 260;
  const height = opts.height ?? cfg.height ?? 160;
  const cachePadding = opts.cachePadding ?? cfg.cachePadding ?? 120;
  const showStats = opts.showStats ?? false;
  const includeOrigin = opts.includeOrigin ?? true;
  const needsRedraw = ctx.store.get<unknown>(STORE_KEYS.minimapNeedsRedraw);

  // 适配 Minimap 需要的 cameraRef/commitCamera
  const cameraRef = useRef<Camera>(ctx.getCamera());
  useEffect(() => {
    cameraRef.current = ctx.getCamera();
  });

  const commitCamera = useCallback(
    (next: Camera, immediate?: boolean) => {
      const svc = ctx.getService<{ set: (c: Camera, immediate?: boolean) => void }>('camera');
      if (svc?.set) svc.set(next, immediate);
      else ctx.bus.emit('camera:change', { camera: next, immediate: Boolean(immediate) });
    },
    [ctx]
  );

  return (
    <Minimap
      nodes={nodes}
      visibleCount={visibleCount}
      inViewCount={inViewCount}
      totalCount={totalCount}
      camera={ctx.getCamera()}
      cameraRef={cameraRef}
      commitCamera={commitCamera}
      viewport={viewport}
      width={width}
      height={height}
      cachePadding={cachePadding}
      includeOrigin={includeOrigin}
      needsRedraw={needsRedraw}
      themeVersion={themeVersion}
      showStats={showStats}
    />
  );
}
