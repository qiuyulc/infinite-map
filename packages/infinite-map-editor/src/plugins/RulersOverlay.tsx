import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { clamp, computeAdaptiveSteps, STORE_KEYS, type Camera, type MapContext } from '@qiuyulc/infinite-map';

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
  const guideRootRef = useRef<HTMLDivElement | null>(null);
  const previewVRef = useRef<HTMLDivElement | null>(null);
  const previewHRef = useRef<HTMLDivElement | null>(null);

  // guides 存在 store 里（避免 React 组件重挂载丢失）
  const storeKey = 'rulers:guides';
  const [bump, setBump] = useState(0);
  const guides = (ctx.store.get<{ v: number[]; h: number[] }>(storeKey) ?? { v: [], h: [] }) as { v: number[]; h: number[] };
  void bump;

  const setGuides = (next: { v: number[]; h: number[] }) => {
    ctx.store.set(storeKey, next);
    ctx.requestRender();
  };

  const updateVGuide = (index: number, x: number) => {
    const v = guides.v.slice();
    v[index] = x;
    // 拖动过程中不排序，避免“跨越/跳动”；如需排序可在松手时处理
    setGuides({ v, h: guides.h });
  };
  const updateHGuide = (index: number, y: number) => {
    const h = guides.h.slice();
    h[index] = y;
    // 同上：拖动过程中不排序
    setGuides({ v: guides.v, h });
  };
  const deleteVGuide = (index: number) => {
    const v = guides.v.slice();
    v.splice(index, 1);
    setGuides({ v, h: guides.h });
  };
  const deleteHGuide = (index: number) => {
    const h = guides.h.slice();
    h.splice(index, 1);
    setGuides({ v: guides.v, h });
  };

  useEffect(() => {
    const now = () => ((globalThis as any).performance?.now ? (globalThis as any).performance.now() : Date.now());
    // 注意：performance.now() 在页面初始时可能非常小（例如 < 16ms），
    // 如果 lastTs=0 且我们有 minGap 节流，会导致首帧 update 被直接跳过，
    // 表现为“初始只有边框，没有刻度；拖动后才出现”。
    let lastTs = -1e9;
    let raf: number | null = null;
    let pending: { cam: any; vp: any } | null = null;

    const updateDom = () => {
      raf = null;
      if (!pending) return;
      const { cam, vp } = pending;

      const hSvg = hSvgRef.current;
      const vSvg = vSvgRef.current;
      if (!hSvg || !vSvg) return;

      const z = cam.zoom || 1;
      if (!(vp.w > 0 && vp.h > 0 && isFinite(z) && z > 0)) {
        // viewport 尚未就绪，保留 pending 重试
        raf = requestAnimationFrame(updateDom);
        return;
      }
      pending = null;

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
        // 关键：给 svg 加一个“透明底板”，让用户在刻度空隙处也能拖拽触发 pointer events
        const bg = document.createElementNS(SVG_NS, 'rect');
        bg.setAttribute('x', '0');
        bg.setAttribute('y', '0');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', 'transparent');
        bg.setAttribute('pointer-events', 'all');
        frag.appendChild(bg);
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
        // 关键：给 svg 加一个“透明底板”，让用户在刻度空隙处也能拖拽触发 pointer events
        const bg = document.createElementNS(SVG_NS, 'rect');
        bg.setAttribute('x', '0');
        bg.setAttribute('y', '0');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', 'transparent');
        bg.setAttribute('pointer-events', 'all');
        frag.appendChild(bg);
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

      // 总是更新 pending（即使被节流/raf 去重拦截），
      // 确保已调度的 rAF 回调拿到的是最新数据。
      const st = engine.store.getState();
      pending = { cam: st.view, vp: st.viewport };

      if (t - lastTs < minGap) return;
      lastTs = t;
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

  // guide layer 跟随 view.transform（与节点层同一套 transform，保证缩放/平移不“慢半拍”）
  useEffect(() => {
    const el = guideRootRef.current;
    if (!el) return;

    const apply = (view?: any) => {
      const v = view ?? engine.store.getState().view;
      const z = (v.zoom || 1) as number;
      el.style.transform = v.transform;
      el.style.transformOrigin = '0 0';
      el.style.willChange = 'transform';
      el.style.setProperty('--im-zoom-inv', String(1 / z));
    };
    apply();
    const un = engine.store.subscribe((s: any) => s.view, (v: any) => apply(v), { equalityFn: () => false });
    const un2 = ctx.store.subscribe(storeKey, () => setBump((x) => x + 1));
    return () => {
      un?.();
      un2?.();
    };
  }, [ctx, engine.store]);

  const cameraSvc = ctx.getService<{ get?: () => Camera; set?: (next: Camera, immediate?: boolean) => void }>('camera');
  const commitCamera = (next: Camera, immediate = false) => {
    if (cameraSvc?.set) cameraSvc.set(next, immediate);
    else ctx.bus.emit('camera:set', { camera: next, immediate });
  };

  const dragRef = useRef<{
    axis: 'x' | 'y';
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startCam: Camera;
    mode: 'unknown' | 'pan' | 'guide';
  } | null>(null);

  const guideDragRef = useRef<
    | null
    | {
        kind: 'v' | 'h';
        index: number;
        pointerId: number;
      }
  >(null);

  // 拖拽过程中禁用浏览器文本选择（否则会选中标尺文字/SVG text）
  const bodyUserSelectRef = useRef<string | null>(null);
  const setGlobalUserSelect = (disabled: boolean) => {
    const body = document?.body as HTMLElement | undefined;
    if (!body) return;
    if (disabled) {
      if (bodyUserSelectRef.current == null) bodyUserSelectRef.current = body.style.userSelect;
      body.style.userSelect = 'none';
    } else {
      if (bodyUserSelectRef.current != null) body.style.userSelect = bodyUserSelectRef.current;
      bodyUserSelectRef.current = null;
    }
  };

  const beginDrag = (axis: 'x' | 'y', e: PointerEvent | React.PointerEvent) => {
    const cam = ctx.getCamera();
    (e as any).preventDefault?.();
    setGlobalUserSelect(true);
    dragRef.current = {
      axis,
      pointerId: (e as any).pointerId ?? 0,
      startClientX: (e as any).clientX ?? 0,
      startClientY: (e as any).clientY ?? 0,
      startCam: { x: cam.x, y: cam.y, zoom: cam.zoom || 1 },
      mode: 'unknown',
    };
  };

  // 注意：这里使用“整个画布容器的 rect”（可用标尺自身 rect 近似：顶部标尺的 top/left 即容器 top/left）
  const updatePreview = (axis: 'x' | 'y', cam: Camera, clientX: number, clientY: number, containerRect: DOMRect) => {
    const z = cam.zoom || 1;
    if (axis === 'x') {
      const xPx = clientX - containerRect.left;
      const worldX = cam.x + xPx / z;
      const el = previewVRef.current;
      if (el) {
        el.style.display = 'block';
        el.style.left = `${worldX}px`;
      }
      return { worldX };
    } else {
      const yPx = clientY - containerRect.top;
      const worldY = cam.y + yPx / z;
      const el = previewHRef.current;
      if (el) {
        el.style.display = 'block';
        el.style.top = `${worldY}px`;
      }
      return { worldY };
    }
  };

  const hidePreview = () => {
    if (previewVRef.current) previewVRef.current.style.display = 'none';
    if (previewHRef.current) previewHRef.current.style.display = 'none';
  };

  const onPointerMove = (e: PointerEvent, containerRect: DOMRect, rulerRect: DOMRect) => {
    const st = dragRef.current;
    if (!st) return;
    if (e.pointerId !== st.pointerId) return;

    const dx = e.clientX - st.startClientX;
    const dy = e.clientY - st.startClientY;
    const camNow = ctx.getCamera();
    const z = camNow.zoom || 1;

    // 决策模式：
    // - 从标尺向内容区域拖出：guide
    // - 在标尺条内横/纵向拖动：pan（单轴）
    if (st.mode === 'unknown') {
      if (st.axis === 'x') {
        // 顶部标尺：向下进入内容区
        const intoContent = e.clientY - rulerRect.top > thickness + 4;
        if (intoContent && Math.abs(dy) > 6) st.mode = 'guide';
        else if (Math.abs(dx) > 3) st.mode = 'pan';
      } else {
        // 左侧标尺：向右进入内容区
        const intoContent = e.clientX - rulerRect.left > thickness + 4;
        if (intoContent && Math.abs(dx) > 6) st.mode = 'guide';
        else if (Math.abs(dy) > 3) st.mode = 'pan';
      }
    }

    if (st.mode === 'pan') {
      hidePreview();
      if (st.axis === 'x') {
        commitCamera({ x: st.startCam.x - dx / z, y: st.startCam.y, zoom: z }, false);
      } else {
        commitCamera({ x: st.startCam.x, y: st.startCam.y - dy / z, zoom: z }, false);
      }
      return;
    }

    if (st.mode === 'guide') {
      updatePreview(st.axis, camNow, e.clientX, e.clientY, containerRect);
    }
  };

  const onPointerUp = (e: PointerEvent, containerRect: DOMRect) => {
    const st = dragRef.current;
    if (!st) return;
    if (e.pointerId !== st.pointerId) return;
    const camNow = ctx.getCamera();

    if (st.mode === 'guide') {
      const res = updatePreview(st.axis, camNow, e.clientX, e.clientY, containerRect) as any;
      if (st.axis === 'x' && typeof res.worldX === 'number') {
        const v = [...guides.v, res.worldX].sort((a, b) => a - b);
        setGuides({ v, h: guides.h });
      }
      if (st.axis === 'y' && typeof res.worldY === 'number') {
        const h = [...guides.h, res.worldY].sort((a, b) => a - b);
        setGuides({ v: guides.v, h });
      }
    }

    hidePreview();
    dragRef.current = null;
  };

  const onHDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    beginDrag('x', e);
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  };

  const onVDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    beginDrag('y', e);
    (e.currentTarget as any).setPointerCapture?.(e.pointerId);
  };

  const onHMove = (e: React.PointerEvent) => {
    const svg = hSvgRef.current;
    if (!svg) return;
    const st = dragRef.current;
    if (!st || st.axis !== 'x') return;
    const rulerRect = svg.getBoundingClientRect();
    // 顶部标尺的 rect.left/top 可以视为容器的 left/top
    const containerRect = rulerRect;
    onPointerMove(e.nativeEvent, containerRect, rulerRect);
  };
  const onVMove = (e: React.PointerEvent) => {
    const svg = vSvgRef.current;
    if (!svg) return;
    const st = dragRef.current;
    if (!st || st.axis !== 'y') return;
    const rulerRect = svg.getBoundingClientRect();
    const containerRect = rulerRect;
    onPointerMove(e.nativeEvent, containerRect, rulerRect);
  };
  const onHUp = (e: React.PointerEvent) => {
    const svg = hSvgRef.current;
    if (!svg) return;
    const st = dragRef.current;
    if (!st || st.axis !== 'x') return;
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    onPointerUp(e.nativeEvent, rect);
    setGlobalUserSelect(false);
  };
  const onVUp = (e: React.PointerEvent) => {
    const svg = vSvgRef.current;
    if (!svg) return;
    const st = dragRef.current;
    if (!st || st.axis !== 'y') return;
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    onPointerUp(e.nativeEvent, rect);
    setGlobalUserSelect(false);
  };

  const clearGuides = () => {
    setGuides({ v: [], h: [] });
    hidePreview();
    ctx.requestRender();
  };

  const stopGuideDrag = () => {
    guideDragRef.current = null;
    window.removeEventListener('pointermove', onGuideMove as any);
    window.removeEventListener('pointerup', onGuideUp as any);
    window.removeEventListener('pointercancel', onGuideUp as any);
    setGlobalUserSelect(false);
  };

  const onGuideMove = (e: PointerEvent) => {
    const st = guideDragRef.current;
    if (!st) return;
    if (e.pointerId !== st.pointerId) return;
    // 防止浏览器做文本选择/拖拽默认行为
    e.preventDefault?.();
    const cam = ctx.getCamera();
    const z = cam.zoom || 1;
    if (st.kind === 'v') {
      const rect =
        hSvgRef.current?.getBoundingClientRect() ??
        (guideRootRef.current?.getBoundingClientRect() as DOMRect | undefined);
      if (!rect) return;
      const xPx = e.clientX - rect.left;
      updateVGuide(st.index, cam.x + xPx / z);
    } else {
      const rect =
        vSvgRef.current?.getBoundingClientRect() ??
        (guideRootRef.current?.getBoundingClientRect() as DOMRect | undefined);
      if (!rect) return;
      const yPx = e.clientY - rect.top;
      updateHGuide(st.index, cam.y + yPx / z);
    }
  };

  const onGuideUp = (e: PointerEvent) => {
    const st = guideDragRef.current;
    if (!st) return;
    if (e.pointerId !== st.pointerId) return;
    e.preventDefault?.();
    stopGuideDrag();
  };

  const startGuideDrag = (kind: 'v' | 'h', index: number, e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setGlobalUserSelect(true);
    guideDragRef.current = { kind, index, pointerId: e.pointerId };
    // pointer capture：优先使用（更可靠）
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    // 兜底：部分环境下 capture 对 overlay/SVG 组合不稳定，这里同时监听 window
    window.addEventListener('pointermove', onGuideMove as any);
    window.addEventListener('pointerup', onGuideUp as any);
    window.addEventListener('pointercancel', onGuideUp as any);
  };

  const baseSvgStyle: CSSProperties = {
    position: 'absolute',
    pointerEvents: 'auto',
    background: 'var(--im-ruler-bg, rgba(255,255,255,0.75))',
    userSelect: 'none',
    zIndex: 1,
  };

  const guideClipStyle: CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      // 不遮住标尺区域：用 overflow 裁剪，避免部分浏览器 clip-path 兼容性问题
      left: thickness,
      top: thickness,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
    }),
    [thickness]
  );

  return (
    <>
      <div
        data-im-ui
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: thickness,
          height: thickness,
          background: 'var(--im-ruler-bg, rgba(255,255,255,0.75))',
          pointerEvents: 'auto',
          cursor: 'pointer',
          zIndex: 2,
        }}
        title="双击清除参考线"
        onDoubleClick={clearGuides}
      />
      <svg
        ref={hSvgRef}
        width="100%"
        height={thickness}
        style={{ ...baseSvgStyle, left: 0, top: 0, cursor: 'ew-resize', display: 'block' }}
        aria-hidden="true"
        data-im-ui
        onPointerDown={onHDown}
        onPointerMove={onHMove}
        onPointerUp={onHUp}
        onPointerCancel={onHUp}
      />
      <svg
        ref={vSvgRef}
        width={thickness}
        height="100%"
        style={{ ...baseSvgStyle, left: 0, top: 0, cursor: 'ns-resize', display: 'block' }}
        aria-hidden="true"
        data-im-ui
        onPointerDown={onVDown}
        onPointerMove={onVMove}
        onPointerUp={onVUp}
        onPointerCancel={onVUp}
      />

      {/* Guides：世界坐标系元素 + 同步 view.transform（保证缩放/平移一致） */}
      <div style={guideClipStyle} aria-hidden="true">
        <div
          ref={guideRootRef}
          style={{
            position: 'absolute',
            // guideRoot 的坐标原点仍按“完整容器(含标尺)”的左上角来算，
            // 所以这里往左/上补回 thickness，保持 world->screen 换算一致
            left: -thickness,
            top: -thickness,
            right: 0,
            bottom: 0,
          }}
        >
          {guides.v.map((x, idx) => (
            <div
              key={`v:${x}:${idx}`}
              data-im-ui
              title="拖动调整位置；双击删除"
              style={{
                position: 'absolute',
                left: x,
                top: -100000,
                width: `calc(10px * var(--im-zoom-inv, 1))`,
                height: 200000,
                transform: 'translateX(-50%)',
                pointerEvents: 'auto',
                cursor: 'col-resize',
                // hit area transparent
                background: 'transparent',
              }}
              onPointerDown={(e) => startGuideDrag('v', idx, e)}
              onDoubleClick={() => deleteVGuide(idx)}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  width: 'calc(1px * var(--im-zoom-inv, 1))',
                  height: '100%',
                  transform: 'translateX(-50%)',
                  background: 'var(--im-guide, rgba(59,130,246,0.8))',
                  pointerEvents: 'none',
                }}
              />
            </div>
          ))}
          {guides.h.map((y, idx) => (
            <div
              key={`h:${y}:${idx}`}
              data-im-ui
              title="拖动调整位置；双击删除"
              style={{
                position: 'absolute',
                top: y,
                left: -100000,
                height: `calc(10px * var(--im-zoom-inv, 1))`,
                width: 200000,
                transform: 'translateY(-50%)',
                pointerEvents: 'auto',
                cursor: 'row-resize',
                background: 'transparent',
              }}
              onPointerDown={(e) => startGuideDrag('h', idx, e)}
              onDoubleClick={() => deleteHGuide(idx)}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  height: 'calc(1px * var(--im-zoom-inv, 1))',
                  width: '100%',
                  transform: 'translateY(-50%)',
                  background: 'var(--im-guide, rgba(59,130,246,0.8))',
                  pointerEvents: 'none',
                }}
              />
            </div>
          ))}

          {/* preview */}
          <div
            ref={previewVRef}
            style={{
              display: 'none',
              position: 'absolute',
              left: 0,
              top: -100000,
              width: 'calc(1px * var(--im-zoom-inv, 1))',
              height: 200000,
              background: 'var(--im-guide-preview, rgba(59,130,246,0.45))',
            }}
          />
          <div
            ref={previewHRef}
            style={{
              display: 'none',
              position: 'absolute',
              top: 0,
              left: -100000,
              height: 'calc(1px * var(--im-zoom-inv, 1))',
              width: 200000,
              background: 'var(--im-guide-preview, rgba(59,130,246,0.45))',
            }}
          />
        </div>
      </div>
    </>
  );
}
