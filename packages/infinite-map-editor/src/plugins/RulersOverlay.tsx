import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { clamp, computeAdaptiveSteps, STORE_KEYS, type MapContext } from '@qiuyulc/infinite-map';

type Tick = { posPx: number; major: boolean; label?: string };

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function formatValue(v: number) {
  const r0 = Math.round(v);
  if (Math.abs(v - r0) < 1e-6) return String(r0);
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function buildTicks(
  startWorld: number,
  endWorld: number,
  zoom: number,
  opts: { majorStepWorld: number; minorCount: number; labelEveryMajor: number }
): { stepWorld: number; ticks: Tick[] } {
  const majorStepWorld = opts.majorStepWorld;
  const minorCount = Math.max(1, Math.floor(opts.minorCount));
  const minorStepWorld = majorStepWorld / minorCount;
  const labelEveryMajor = Math.max(1, Math.floor(opts.labelEveryMajor));

  const stepWorld = minorStepWorld;
  const ticks: Tick[] = [];
  const firstK = Math.floor(startWorld / minorStepWorld);
  const first = firstK * minorStepWorld;
  const maxN = Math.ceil((endWorld - first) / minorStepWorld) + 2; // 防止边界缺线
  for (let i = 0; i < maxN; i++) {
    const k = firstK + i;
    const w = k * minorStepWorld;
    if (w < startWorld - minorStepWorld) continue;
    if (w > endWorld + minorStepWorld) break;
    const px = (w - startWorld) * zoom;
    const major = mod(k, minorCount) === 0;
    const majorIndex = Math.floor(k / minorCount);
    const label = major && mod(majorIndex, labelEveryMajor) === 0 ? formatValue(w) : undefined;
    ticks.push({ posPx: px, major, label });
  }
  return { stepWorld, ticks };
}

export type RulersOverlayProps = {
  ctx: MapContext;
  thickness?: number; // px
};

export const RulersOverlay = memo(function RulersOverlay({ ctx, thickness = 24 }: RulersOverlayProps) {
  const engine = ctx.getService<{ store: { getState: () => any; subscribe: any } }>('engine');
  if (!engine) return null;
  return <EngineRulersOverlay ctx={ctx} thickness={thickness} engine={engine} />;
});

const SVG_NS = 'http://www.w3.org/2000/svg';

function EngineRulersOverlay({
  ctx,
  thickness = 24,
  engine,
}: {
  ctx: MapContext;
  thickness?: number;
  engine: { store: { getState: () => any; subscribe: any } };
}) {
  const hSvgRef = useRef<SVGSVGElement | null>(null);
  const vSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const now = () => ((globalThis as any).performance?.now ? (globalThis as any).performance.now() : Date.now());
    let lastTs = 0;
    let raf: number | null = null;
    let pending: { cam: any; vp: any } | null = null;

    const updateDom = () => {
      raf = null;
      if (!pending) return;
      const { cam, vp } = pending;
      pending = null;

      const hSvg = hSvgRef.current;
      const vSvg = vSvgRef.current;
      if (!hSvg || !vSvg) return;

      const z = cam.zoom || 1;
      if (!(vp.w > 0 && vp.h > 0 && isFinite(z) && z > 0)) return;

      const viewStartX = cam.x + thickness / z;
      const viewEndX = cam.x + vp.w / z;
      const viewStartY = cam.y + thickness / z;
      const viewEndY = cam.y + vp.h / z;

      const { majorStepWorld, minorCount } = computeAdaptiveSteps(z);
      const zoomFactor = Math.sqrt(z);
      const labelMinGapPx = clamp(28 / zoomFactor, 16, 44);
      const labelEveryMajor = Math.max(1, Math.ceil(labelMinGapPx / Math.max(majorStepWorld * z, 1e-6)));

      const h = buildTicks(viewStartX, viewEndX, z, { majorStepWorld, minorCount, labelEveryMajor });
      const v = buildTicks(viewStartY, viewEndY, z, { majorStepWorld, minorCount, labelEveryMajor });

      const tickStroke = 'var(--im-ruler-tick, rgba(15,23,42,0.35))';
      const textFill = 'var(--im-ruler-text, rgba(15,23,42,0.70))';
      const fontSize = 9;
      const labelAreaPx = fontSize + 6;
      const tickMajorLen = Math.max(8, thickness - labelAreaPx);
      const tickMinorLen = Math.max(5, tickMajorLen - 3);
      const hLabelY = tickMajorLen + 2;
      const vLabelX = Math.min(thickness - 2, tickMajorLen + 4);

      // horizontal
      {
        const frag = document.createDocumentFragment();
        for (const t of h.ticks) {
          const x = Math.round(t.posPx + thickness) + 0.5;
          const y1 = 0.5;
          const y2 = (t.major ? tickMajorLen : tickMinorLen) + 0.5;
          const line = document.createElementNS(SVG_NS, 'line');
          line.setAttribute('x1', String(x));
          line.setAttribute('y1', String(y1));
          line.setAttribute('x2', String(x));
          line.setAttribute('y2', String(y2));
          line.setAttribute('stroke', tickStroke);
          line.setAttribute('stroke-width', '1');
          line.setAttribute('shape-rendering', 'crispEdges');
          frag.appendChild(line);
        }
        for (const t of h.ticks) {
          if (!t.label) continue;
          const x = Math.round(t.posPx + thickness) + 0.5;
          if (x < thickness + 2) continue;
          const text = document.createElementNS(SVG_NS, 'text');
          text.setAttribute('x', String(x));
          text.setAttribute('y', String(hLabelY));
          text.setAttribute('font-size', String(fontSize));
          text.setAttribute('fill', textFill);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'hanging');
          text.textContent = t.label;
          frag.appendChild(text);
        }
        while (hSvg.firstChild) hSvg.removeChild(hSvg.firstChild);
        hSvg.appendChild(frag);
      }

      // vertical
      {
        const frag = document.createDocumentFragment();
        for (const t of v.ticks) {
          const y = Math.round(t.posPx + thickness) + 0.5;
          const x1 = 0.5;
          const x2 = (t.major ? tickMajorLen : tickMinorLen) + 0.5;
          const line = document.createElementNS(SVG_NS, 'line');
          line.setAttribute('x1', String(x1));
          line.setAttribute('y1', String(y));
          line.setAttribute('x2', String(x2));
          line.setAttribute('y2', String(y));
          line.setAttribute('stroke', tickStroke);
          line.setAttribute('stroke-width', '1');
          line.setAttribute('shape-rendering', 'crispEdges');
          frag.appendChild(line);
        }
        for (const t of v.ticks) {
          if (!t.label) continue;
          const y = Math.round(t.posPx + thickness) + 0.5;
          if (y < thickness + 2) continue;
          const text = document.createElementNS(SVG_NS, 'text');
          text.setAttribute('x', String(vLabelX));
          text.setAttribute('y', String(y));
          text.setAttribute('font-size', String(fontSize));
          text.setAttribute('fill', textFill);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'hanging');
          text.setAttribute('transform', `rotate(-90 ${vLabelX} ${y})`);
          text.textContent = t.label;
          frag.appendChild(text);
        }
        while (vSvg.firstChild) vSvg.removeChild(vSvg.firstChild);
        vSvg.appendChild(frag);
      }
    };

    const onAny = () => {
      const t = now();
      const panActive = ctx.store.get<boolean>(STORE_KEYS.viewPanActive) === true;
      const minGap = panActive ? 50 : 16;
      if (t - lastTs < minGap) return;
      lastTs = t;
      const st = engine.store.getState();
      pending = { cam: st.view, vp: st.viewport };
      if (raf != null) return;
      raf = requestAnimationFrame(updateDom);
    };

    const un1 = engine.store.subscribe((s: any) => s.view, onAny, { equalityFn: () => false });
    const un2 = engine.store.subscribe((s: any) => s.viewport, onAny, { equalityFn: () => false });
    const un3 = ctx.store.subscribe(STORE_KEYS.viewPanActive, onAny);
    onAny();

    return () => {
      un1?.();
      un2?.();
      un3?.();
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [ctx, engine.store, thickness]);

  const baseSvgStyle: CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    background: 'var(--im-ruler-bg, rgba(255,255,255,0.75))',
  };

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: thickness,
          height: thickness,
          background: 'var(--im-ruler-bg, rgba(255,255,255,0.75))',
          pointerEvents: 'none',
        }}
      />
      <svg ref={hSvgRef} width="100%" height={thickness} style={{ ...baseSvgStyle, left: 0, top: 0 }} aria-hidden="true" />
      <svg ref={vSvgRef} width={thickness} height="100%" style={{ ...baseSvgStyle, left: 0, top: 0 }} aria-hidden="true" />
    </>
  );
}

