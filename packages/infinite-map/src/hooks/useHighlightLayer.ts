import { useEffect, type MutableRefObject, type RefObject } from 'react';
import type { Camera } from '../core/types';
import { clamp, cssVarNum, cssVarRgb } from '../core/utils';

type Params = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewport: { w: number; h: number };
  viewportRef: MutableRefObject<{ w: number; h: number }>;
  cameraRef: MutableRefObject<Camera>;
  mouseRef: MutableRefObject<{ x: number; y: number } | null>;
  pulseRef: MutableRefObject<{ value: number; lastTs: number }>;
  dotSpacing: number;
  dotRadiusPx: number;
  highlightRadiusPx: number;
  wheelPulseStrength: number;
};

export function useHighlightLayer({
  canvasRef,
  viewport,
  viewportRef,
  cameraRef,
  mouseRef,
  pulseRef,
  dotSpacing,
  dotRadiusPx,
  highlightRadiusPx,
  wheelPulseStrength,
}: Params) {
  // DPR
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(viewport.w * dpr);
    c.height = Math.floor(viewport.h * dpr);
    c.style.width = `${viewport.w}px`;
    c.style.height = `${viewport.h}px`;
    const ctx = c.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [canvasRef, viewport.w, viewport.h]);

  // draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      ctx.clearRect(0, 0, w, h);

      const m = mouseRef.current;
      if (!m && p.value === 0) return;

      const cam = cameraRef.current;
      const z = cam.zoom;
      const mx = m?.x ?? w / 2;
      const my = m?.y ?? h / 2;
      const sigma = highlightRadiusPx * 0.55;
      const pulseBoost = p.value * wheelPulseStrength;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';

      // 轻微氛围
      {
        const baseA0 = cssVarNum('--highlight-base-a', 0.06);
        const baseAp = cssVarNum('--highlight-pulse-a', 0.09);
        const baseA = clamp(baseA0 + pulseBoost * baseAp, 0, 0.2);
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, highlightRadiusPx * 0.85);
        g.addColorStop(0, `rgba(110, 200, 255, ${baseA})`);
        g.addColorStop(0.4, `rgba(110, 200, 255, ${baseA * 0.35})`);
        g.addColorStop(1, 'rgba(110, 200, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mx, my, highlightRadiusPx * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }

      // 小范围点高亮
      const radiusWorld = highlightRadiusPx / z;
      const wx0 = cam.x + mx / z;
      const wy0 = cam.y + my / z;
      const startX = Math.floor((wx0 - radiusWorld) / dotSpacing) * dotSpacing;
      const startY = Math.floor((wy0 - radiusWorld) / dotSpacing) * dotSpacing;
      const endX = wx0 + radiusWorld;
      const endY = wy0 + radiusWorld;

      const r = dotRadiusPx * Math.max(0.9, Math.min(1.6, Math.sqrt(z)));
      const hiRgb = cssVarRgb('--highlight-rgb', '80 170 255');
      const dotA0 = cssVarNum('--highlight-dot-a', 0.52);
      const dotAp = cssVarNum('--highlight-dot-pulse-a', 0.34);
      const dotCap = cssVarNum('--highlight-dot-cap', 0.78);
      const shadowBase = cssVarNum('--highlight-shadow-base', 3);
      const shadowBoost = cssVarNum('--highlight-shadow-boost', 7);
      const shadowPulse = cssVarNum('--highlight-shadow-pulse', 5.5);

      for (let wx = startX; wx <= endX; wx += dotSpacing) {
        for (let wy = startY; wy <= endY; wy += dotSpacing) {
          const sx = (wx - cam.x) * z;
          const sy = (wy - cam.y) * z;
          const dx = sx - mx;
          const dy = sy - my;
          const d2 = dx * dx + dy * dy;
          if (d2 > highlightRadiusPx * highlightRadiusPx * 1.25) continue;

          const boost = Math.exp(-d2 / (2 * sigma * sigma));
          const a = clamp(boost * (dotA0 + pulseBoost * dotAp), 0, dotCap);
          ctx.fillStyle = `rgba(${hiRgb}, ${a})`;
          ctx.shadowColor = `rgba(${hiRgb}, ${a})`;
          ctx.shadowBlur = shadowBase + shadowBoost * boost + shadowPulse * pulseBoost;
          ctx.beginPath();
          ctx.arc(sx, sy, r * (1 + boost * 0.22), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    canvasRef,
    cameraRef,
    dotRadiusPx,
    dotSpacing,
    highlightRadiusPx,
    mouseRef,
    pulseRef,
    viewportRef,
    wheelPulseStrength,
  ]);
}
