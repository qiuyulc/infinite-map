import { memo, useEffect, useRef } from 'react';
import {
  clamp,
  computeAdaptiveSteps,
  cssVarNum,
  cssVarRgb,
  STORE_KEYS,
  useEngineSelector,
  type Camera,
  type EngineStore,
  type InfiniteMapPlugin,
  type InputPipelineHooks,
  type MapContext,
  type MapWheelEvent,
} from '@qiuyulc/infinite-map';

export type HoverHighlightPluginOptions = {
  /**
   * 点阵间距（世界坐标单位）
   * - 'auto'：随 zoom 自适应（与 background/rulers 同源）
   */
  dotSpacing?: number | 'auto';
  /**
   * 点半径（屏幕像素，最终会随 zoom 变化不大）
   */
  dotRadiusPx?: number;
  /**
   * 高亮半径（屏幕像素）
   */
  highlightRadiusPx?: number;
  /**
   * wheel 时的“高亮脉冲”强度
   */
  wheelPulseStrength?: number;
};

type EngineService = { store: EngineStore; cameraRef: React.MutableRefObject<Camera> };

/**
 * 鼠标划过的“背景高亮点/脉冲”效果（Canvas）
 * - 属于编辑体验增强（editor UX），放在 @qiuyulc/infinite-map-editor
 * - 通过 inputHooks（hover move）+ input.onWheel（脉冲）驱动
 */
export function createHoverHighlightPlugin(opts: HoverHighlightPluginOptions = {}): InfiniteMapPlugin {
  const mouseRef = { current: null as { x: number; y: number } | null };
  const pulseRef = { current: { value: 0, lastTs: 0 } };

  const inputHooks: InputPipelineHooks = {
    onBeforeHitTest: (e, _ctx, _info) => {
      if (!('type' in e)) return;
      // 仅在 hover 管线运行时记录最新 mouse 位置（active gesture 时 core 不跑 hover hitTest）
      if (e.type === 'move') mouseRef.current = { x: e.screen.x, y: e.screen.y };
      if (e.type === 'cancel') mouseRef.current = null;
    },
  };

  const onWheel = (e: MapWheelEvent, _ctx: MapContext) => {
    pulseRef.current.value = 1;
    mouseRef.current = { x: e.screen.x, y: e.screen.y };
    return { handled: true, mode: 'continue' } as const;
  };

  const Overlay = memo(function HoverHighlightOverlay({ ctx }: { ctx: MapContext }) {
    const engine = ctx.getService<EngineService>('engine');
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const viewportRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

    if (!engine) return null;

    // 只关心 viewport 结构性变化（避免高频订阅）
    const viewport = useEngineSelector(
      engine.store,
      (s) => s.viewport,
      (a, b) => a.w === b.w && a.h === b.h
    );
    useEffect(() => {
      viewportRef.current = viewport;
    }, [viewport]);

    const dotSpacing = opts.dotSpacing ?? 'auto';
    const dotRadiusPx = opts.dotRadiusPx ?? 1.35;
    const highlightRadiusPx = opts.highlightRadiusPx ?? 140;
    const wheelPulseStrength = opts.wheelPulseStrength ?? 0.55;

    // hover 离开画布时，清掉 mouseRef（避免残影）
    useEffect(() => {
      return ctx.store.subscribe(STORE_KEYS.hoverHit, () => {
        const hit = ctx.store.get<any>(STORE_KEYS.hoverHit);
        if (hit?.kind === 'blank') mouseRef.current = null;
      });
    }, [ctx]);

    // DPR
    useEffect(() => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.floor(viewport.w * dpr);
      c.height = Math.floor(viewport.h * dpr);
      c.style.width = `${viewport.w}px`;
      c.style.height = `${viewport.h}px`;
      const g = c.getContext('2d');
      if (g) g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, [viewport.h, viewport.w]);

    // draw
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const g = canvas.getContext('2d');
      if (!g) return;

      let raf = 0;
      const tick = (ts: number) => {
        raf = requestAnimationFrame(tick);

        // pulse 衰减
        const p = pulseRef.current;
        const dt = p.lastTs ? ts - p.lastTs : 16;
        p.lastTs = ts;
        p.value *= Math.pow(0.001, dt / 800);
        if (p.value < 0.001) p.value = 0;

        const { w, h } = viewportRef.current;
        if (w <= 0 || h <= 0) return;
        g.clearRect(0, 0, w, h);

        const m = mouseRef.current;
        if (!m && p.value === 0) return;

        const cam = engine.cameraRef.current;
        const z = cam.zoom || 1;
        const mx = m?.x ?? w / 2;
        const my = m?.y ?? h / 2;
        const spacingWorld = dotSpacing === 'auto' ? computeAdaptiveSteps(z).minorStepWorld : dotSpacing;
        const sigma = highlightRadiusPx * 0.55;
        const pulseBoost = p.value * wheelPulseStrength;

        g.save();
        g.globalCompositeOperation = 'source-over';

        // 轻微氛围
        {
          const baseA0 = cssVarNum('--highlight-base-a', 0.06, canvas);
          const baseAp = cssVarNum('--highlight-pulse-a', 0.09, canvas);
          const baseA = clamp(baseA0 + pulseBoost * baseAp, 0, 0.2);
          const gg = g.createRadialGradient(mx, my, 0, mx, my, highlightRadiusPx * 0.85);
          gg.addColorStop(0, `rgba(110, 200, 255, ${baseA})`);
          gg.addColorStop(0.4, `rgba(110, 200, 255, ${baseA * 0.35})`);
          gg.addColorStop(1, 'rgba(110, 200, 255, 0)');
          g.fillStyle = gg;
          g.beginPath();
          g.arc(mx, my, highlightRadiusPx * 0.85, 0, Math.PI * 2);
          g.fill();
        }

        // 小范围点高亮
        const radiusWorld = highlightRadiusPx / z;
        const wx0 = cam.x + (mx - w / 2) / z;
        const wy0 = cam.y + (my - h / 2) / z;
        const startX = Math.floor((wx0 - radiusWorld) / spacingWorld) * spacingWorld;
        const startY = Math.floor((wy0 - radiusWorld) / spacingWorld) * spacingWorld;
        const endX = wx0 + radiusWorld;
        const endY = wy0 + radiusWorld;

        const r = dotRadiusPx * Math.max(0.9, Math.min(1.6, Math.sqrt(z)));
        const hiRgb = cssVarRgb('--highlight-rgb', '80 170 255', canvas);
        const dotA0 = cssVarNum('--highlight-dot-a', 0.52, canvas);
        const dotAp = cssVarNum('--highlight-dot-pulse-a', 0.34, canvas);
        const dotCap = cssVarNum('--highlight-dot-cap', 0.78, canvas);
        const shadowBase = cssVarNum('--highlight-shadow-base', 3, canvas);
        const shadowBoost = cssVarNum('--highlight-shadow-boost', 7, canvas);
        const shadowPulse = cssVarNum('--highlight-shadow-pulse', 5.5, canvas);

        for (let wx = startX; wx <= endX; wx += spacingWorld) {
          for (let wy = startY; wy <= endY; wy += spacingWorld) {
            const sx = (wx - cam.x) * z + w / 2;
            const sy = (wy - cam.y) * z + h / 2;
            const dx = sx - mx;
            const dy = sy - my;
            const d2 = dx * dx + dy * dy;
            if (d2 > highlightRadiusPx * highlightRadiusPx * 1.25) continue;

            const boost = Math.exp(-d2 / (2 * sigma * sigma));
            const a = clamp(boost * (dotA0 + pulseBoost * dotAp), 0, dotCap);
            g.fillStyle = `rgba(${hiRgb}, ${a})`;
            g.shadowColor = `rgba(${hiRgb}, ${a})`;
            g.shadowBlur = shadowBase + shadowBoost * boost + shadowPulse * pulseBoost;
            g.beginPath();
            g.arc(sx, sy, r * (1 + boost * 0.22), 0, Math.PI * 2);
            g.fill();
          }
        }

        g.shadowBlur = 0;
        g.restore();
      };

      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [dotRadiusPx, dotSpacing, engine.cameraRef, highlightRadiusPx, viewportRef, wheelPulseStrength]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    );
  });

  return {
    id: 'hover-highlight',
    // 放在 background（在节点层之下），避免遮挡节点视觉
    priority: -1000,
    slot: 'background',
    overlay: Overlay,
    input: { onWheel },
    inputHooks,
  };
}
