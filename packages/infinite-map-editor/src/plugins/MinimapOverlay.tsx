import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { rectIntersects, STORE_KEYS, type Camera, type MapContext } from '@qiuyulc/infinite-map';
import { Minimap } from '../components/Minimap';
import { useThemeVersion } from '@qiuyulc/infinite-map';
import type { MinimapPluginOptions } from './createMinimapPlugin';

export const MinimapOverlay = memo(function MinimapOverlay({ ctx, opts }: { ctx: MapContext; opts: MinimapPluginOptions }) {
  const themeVersion = useThemeVersion();
  // 性能：InfiniteMap 在 pan 时会高频更新 camera，从而导致父组件 re-render。
  // minimap 内部包含 canvas 绘制与 nodes 遍历，若每次父组件 render 都执行，会非常卡。
  // 这里用 memo + 事件驱动刷新：只在需要时 bump 自己。
  const [, bump] = useState(0);
  const lastRef = useRef(0);
  useEffect(() => {
    const now = () => ((globalThis as any).performance?.now ? (globalThis as any).performance.now() : Date.now());
    const onCam = () => {
      const t = now();
      const panActive = ctx.store.get<boolean>(STORE_KEYS.viewPanActive) === true;
      const minGap = panActive ? 80 : 33; // pan 中降低刷新频率
      if (t - lastRef.current < minGap) return;
      lastRef.current = t;
      bump((v) => v + 1);
    };
    const unsubs: Array<() => void> = [];
    unsubs.push(ctx.bus.on('camera:changed', onCam));
    // nodes 变化（patches 应用）时刷新 minimap
    unsubs.push(ctx.bus.on('patches:applied' as any, () => bump((v) => v + 1)));
    // 外部强制刷新信号
    unsubs.push(ctx.store.subscribe(STORE_KEYS.minimapNeedsRedraw, () => bump((v) => v + 1)));
    return () => unsubs.forEach((u) => u());
  }, [ctx]);

  const nodes = ctx.getNodes();
  const visibleNodes = ctx.getVisibleNodes();
  const visibleCount = visibleNodes.length;
  const totalCount = nodes.length;
  const viewport = ctx.getViewport();

  const width = opts.width ?? 260;
  const height = opts.height ?? 160;
  const cachePadding = opts.cachePadding ?? 120;
  const showStats = opts.showStats ?? false;
  const includeOrigin = opts.includeOrigin ?? true;
  const needsRedraw = opts.needsRedraw;

  // 严格 “in view”：不包含 overscan，用于 UI 展示当前屏幕内真正可见的节点数量
  const inViewCount = useMemo(() => {
    if (visibleNodes.length === 0) return 0;
    if (viewport.w <= 0 || viewport.h <= 0) return 0;
    const cam = ctx.getCamera();
    const z = cam.zoom || 1;
    const viewWorldRect = { x: cam.x, y: cam.y, w: viewport.w / z, h: viewport.h / z };
    let count = 0;
    for (const n of visibleNodes) if (rectIntersects(viewWorldRect, { x: n.x, y: n.y, w: n.width, h: n.height })) count++;
    return count;
  }, [ctx, visibleNodes, viewport.h, viewport.w]);

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
});
