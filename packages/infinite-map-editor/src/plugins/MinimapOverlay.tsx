import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cssVar, rectIntersects, STORE_KEYS, type Camera, type MapContext, type NodeData } from '@qiuyulc/infinite-map';
import { Minimap } from '../components/Minimap';
import { useThemeVersion } from '@qiuyulc/infinite-map';
import type { MinimapPluginOptions } from './createMinimapPlugin';

export const MinimapOverlay = memo(function MinimapOverlay({ ctx, opts }: { ctx: MapContext; opts: MinimapPluginOptions }) {
  const engine = ctx.getService<{ store: any; cameraRef: React.MutableRefObject<Camera> }>('engine');
  if (engine) {
    return <EngineMinimapOverlay ctx={ctx} opts={opts} engine={engine} />;
  }

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

type Transform = { minX: number; minY: number; scale: number; offsetX: number; offsetY: number };

function EngineMinimapOverlay({
  ctx,
  opts,
  engine,
}: {
  ctx: MapContext;
  opts: MinimapPluginOptions;
  engine: { store: any; cameraRef: React.MutableRefObject<Camera> };
}) {
  const themeVersion = useThemeVersion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transformRef = useRef<Transform | null>(null);
  const rafRef = useRef<number | null>(null);

  const width = opts.width ?? 260;
  const height = opts.height ?? 160;
  const cachePadding = opts.cachePadding ?? 120;
  const showStats = opts.showStats ?? false;
  const includeOrigin = opts.includeOrigin ?? true;
  const needsRedraw = opts.needsRedraw;

  const nodes = ctx.getNodes();

  // DPR/尺寸
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(width * dpr);
    c.height = Math.floor(height * dpr);
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const g = c.getContext('2d');
    if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  const redrawStatic = useCallback(() => {
    const dpr = window.devicePixelRatio || 1;
    if (!staticCanvasRef.current) staticCanvasRef.current = document.createElement('canvas');
    const sc = staticCanvasRef.current;
    const el = canvasRef.current;
    if (!el) return;
    sc.width = Math.floor(width * dpr);
    sc.height = Math.floor(height * dpr);
    const sctx = sc.getContext('2d');
    if (!sctx) return;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    if (includeOrigin) {
      minX = Math.min(minX, 0);
      minY = Math.min(minY, 0);
      maxX = Math.max(maxX, 0);
      maxY = Math.max(maxY, 0);
    }
    if (!isFinite(minX) || !isFinite(minY)) {
      minX = 0;
      minY = 0;
      maxX = 1;
      maxY = 1;
    }
    const pad = cachePadding;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const bboxW = Math.max(1, maxX - minX);
    const bboxH = Math.max(1, maxY - minY);
    const scale = Math.min(width / bboxW, height / bboxH);
    const offsetX = (width - bboxW * scale) / 2;
    const offsetY = (height - bboxH * scale) / 2;
    transformRef.current = { minX, minY, scale, offsetX, offsetY };

    sctx.clearRect(0, 0, width, height);
    sctx.fillStyle = cssVar('--im-minimap-bg', 'rgba(10, 14, 22, 0.55)', el);
    sctx.fillRect(0, 0, width, height);
    sctx.strokeStyle = cssVar('--im-minimap-border', 'rgba(255,255,255,0.10)', el);
    sctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const defaultNodeFill = cssVar('--im-minimap-node', 'rgba(120, 180, 255, 0.75)', el);
    for (const n of nodes) {
      const x = offsetX + (n.x - minX) * scale;
      const y = offsetY + (n.y - minY) * scale;
      const nw = Math.max(2, n.width * scale);
      const nh = Math.max(2, n.height * scale);
      sctx.fillStyle = n.color ?? defaultNodeFill;
      sctx.fillRect(x, y, nw, nh);
    }
  }, [cachePadding, height, includeOrigin, nodes, width]);

  const redrawDynamic = useCallback(() => {
    const c = canvasRef.current;
    const sc = staticCanvasRef.current;
    const t = transformRef.current;
    if (!c || !sc || !t) return;
    const g = c.getContext('2d');
    if (!g) return;

    g.clearRect(0, 0, width, height);
    g.drawImage(sc, 0, 0, width, height);

    const cam = engine.cameraRef.current;
    const vp = ctx.getViewport();
    const vwWorld = vp.w / cam.zoom;
    const vhWorld = vp.h / cam.zoom;
    const vx = t.offsetX + (cam.x - t.minX) * t.scale;
    const vy = t.offsetY + (cam.y - t.minY) * t.scale;
    const vw = vwWorld * t.scale;
    const vh = vhWorld * t.scale;
    g.strokeStyle = cssVar('--im-minimap-viewport', 'rgba(255,255,255,0.75)', canvasRef.current);
    g.lineWidth = 1;
    g.strokeRect(vx, vy, vw, vh);

    // 统计（可选，避免默认做重计算）
    if (showStats) {
      const visibleNodes = ctx.getVisibleNodes() as NodeData[];
      const visibleCount = visibleNodes.length;
      const totalCount = nodes.length;
      let inViewCount = 0;
      if (vp.w > 0 && vp.h > 0) {
        const z = cam.zoom || 1;
        const viewWorldRect = { x: cam.x, y: cam.y, w: vp.w / z, h: vp.h / z };
        for (const n of visibleNodes) if (rectIntersects(viewWorldRect, { x: n.x, y: n.y, w: n.width, h: n.height })) inViewCount++;
      }
      ctx.store.set(STORE_KEYS.minimapInViewCount, inViewCount);
      // 这里不画文字 stats（与原组件一致：stats 由 DOM 层渲染）
      void visibleCount;
      void totalCount;
    }
  }, [ctx, engine.cameraRef, height, nodes.length, showStats, width]);

  // 静态缓存更新：nodes/theme/needsRedraw
  useEffect(() => {
    redrawStatic();
    // 静态更新后补一次动态层
    redrawDynamic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRedraw ?? nodes, width, height, cachePadding, themeVersion, includeOrigin, redrawStatic]);

  // 动态层订阅：camera/view 变化时 rAF redraw
  useEffect(() => {
    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        redrawDynamic();
      });
    };
    const un1 = engine.store.subscribe((s: any) => s.view, schedule, { equalityFn: () => false });
    const un2 = engine.store.subscribe((s: any) => s.viewport, schedule, { equalityFn: () => false });
    schedule();
    return () => {
      un1?.();
      un2?.();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [engine.store, redrawDynamic]);

  // 适配 minimap 的 commitCamera（走 service 优先）
  const commitCamera = useCallback(
    (next: Camera, immediate?: boolean) => {
      const svc = ctx.getService<{ set: (c: Camera, immediate?: boolean) => void }>('camera');
      if (svc?.set) svc.set(next, immediate);
      else ctx.bus.emit('camera:change', { camera: next, immediate: Boolean(immediate) });
    },
    [ctx]
  );

  // minimap 交互（拖拽视口框 / 点击跳转）
  const dragRef = useRef<{ active: boolean; startPx: number; startPy: number; startCamX: number; startCamY: number }>({
    active: false,
    startPx: 0,
    startPy: 0,
    startCamX: 0,
    startCamY: 0,
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const canvas = canvasRef.current;
      const t = transformRef.current;
      if (!canvas || !t) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const dx = px - dragRef.current.startPx;
      const dy = py - dragRef.current.startPy;
      const worldDx = dx / t.scale;
      const worldDy = dy / t.scale;
      commitCamera({ x: dragRef.current.startCamX + worldDx, y: dragRef.current.startCamY + worldDy, zoom: engine.cameraRef.current.zoom }, true);
    };
    const onUp = () => {
      dragRef.current.active = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [commitCamera, engine.cameraRef]);

  const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const canvas = canvasRef.current;
    const t = transformRef.current;
    if (!canvas || !t) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (nodes.length === 0) return;

    const cam = engine.cameraRef.current;
    const vp = ctx.getViewport();
    const vwWorld = vp.w / cam.zoom;
    const vhWorld = vp.h / cam.zoom;

    const vx = t.offsetX + (cam.x - t.minX) * t.scale;
    const vy = t.offsetY + (cam.y - t.minY) * t.scale;
    const vw = vwWorld * t.scale;
    const vh = vhWorld * t.scale;

    const insideViewport = px >= vx && px <= vx + vw && py >= vy && py <= vy + vh;
    if (insideViewport) {
      dragRef.current = { active: true, startPx: px, startPy: py, startCamX: cam.x, startCamY: cam.y };
      canvas.setPointerCapture?.(e.pointerId);
      return;
    }

    const wx = (px - t.offsetX) / t.scale + t.minX;
    const wy = (py - t.offsetY) / t.scale + t.minY;
    commitCamera({ x: wx - vwWorld / 2, y: wy - vhWorld / 2, zoom: cam.zoom }, true);
  };

  // stats（DOM 层，避免每帧触发 React 计算）
  const stats = useMemo(() => {
    const cam = engine.cameraRef.current;
    const visibleCount = (ctx.getVisibleNodes() as NodeData[]).length;
    const totalCount = nodes.length;
    const inViewCount = ctx.store.get<number>(STORE_KEYS.minimapInViewCount) ?? 0;
    return `rendered ${visibleCount}/${totalCount} · in view ${inViewCount} · zoom ${cam.zoom.toFixed(2)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, showStats, themeVersion]);

  return (
    <div
      data-im-ui
      style={{
        position: 'absolute',
        right: 12,
        bottom: 12,
        width,
        height,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
        border: '1px solid var(--im-minimap-border)',
        background: 'rgba(127,127,127,0.10)',
        backdropFilter: 'blur(6px)',
        transition: 'border-color 220ms ease, background-color 220ms ease',
      }}
    >
      <canvas ref={canvasRef} width={width} height={height} onPointerDown={onPointerDown} style={{ display: 'block', cursor: 'pointer' }} />
      {showStats ? (
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            right: 8,
            padding: '3px 6px',
            borderRadius: 999,
            fontSize: 11,
            color: 'var(--text-strong)',
            background: 'rgba(127,127,127,0.12)',
            border: '1px solid var(--panel-border)',
            userSelect: 'none',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {stats}
        </div>
      ) : null}
    </div>
  );
}
