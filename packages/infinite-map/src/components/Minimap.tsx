import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { Camera, NodeData } from '../core/types';
import { cssVar } from '../core/utils';

type Transform = { minX: number; minY: number; scale: number; offsetX: number; offsetY: number };

type Props = {
  nodes: NodeData[];
  visibleCount: number;
  inViewCount: number;
  totalCount: number;
  camera: Camera;
  cameraRef: MutableRefObject<Camera>;
  commitCamera: (next: Camera, immediate?: boolean) => void;
  viewport: { w: number; h: number };

  width: number;
  height: number;
  cachePadding: number;
  /**
   * 是否在 minimap 世界范围计算中包含原点(0,0)
   * - 默认 true（更符合“标尺原点居中”的编辑器语义）
   */
  includeOrigin?: boolean;
  needsRedraw?: unknown;
  themeVersion: number;
  /**
   * 是否显示调试统计（默认关闭，避免作为组件库时出现“业务无关 UI”）
   */
  showStats?: boolean;
};

export function Minimap({
  nodes,
  visibleCount,
  inViewCount,
  totalCount,
  camera,
  cameraRef,
  commitCamera,
  viewport,
  width,
  height,
  cachePadding,
  includeOrigin = true,
  needsRedraw,
  themeVersion,
  showStats = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transformRef = useRef<Transform | null>(null);
  const [staticVersion, setStaticVersion] = useState(0);

  const dragRef = useRef<{
    active: boolean;
    startPx: number;
    startPy: number;
    startCamX: number;
    startCamY: number;
  }>({ active: false, startPx: 0, startPy: 0, startCamX: 0, startCamY: 0 });

  // DPR
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.floor(width * dpr);
    c.height = Math.floor(height * dpr);
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, height]);

  // 静态缓存：背景 + 节点缩略
  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    if (!staticCanvasRef.current) staticCanvasRef.current = document.createElement('canvas');
    const sc = staticCanvasRef.current;
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
    // 没有节点时，用原点构造一个最小 bbox，避免 transformRef 为空导致视口框不画
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
    sctx.fillStyle = cssVar('--im-minimap-bg', 'rgba(10, 14, 22, 0.55)');
    sctx.fillRect(0, 0, width, height);
    sctx.strokeStyle = cssVar('--im-minimap-border', 'rgba(255,255,255,0.10)');
    sctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const defaultNodeFill = cssVar('--im-minimap-node', 'rgba(120, 180, 255, 0.75)');
    for (const n of nodes) {
      const x = offsetX + (n.x - minX) * scale;
      const y = offsetY + (n.y - minY) * scale;
      const nw = Math.max(2, n.width * scale);
      const nh = Math.max(2, n.height * scale);
      sctx.fillStyle = n.color ?? defaultNodeFill;
      sctx.fillRect(x, y, nw, nh);
    }
    // 触发动态层重绘（transformRef 是 ref，不能作为依赖）
    setStaticVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRedraw ?? nodes, width, height, cachePadding, themeVersion, includeOrigin]);

  // 动态层：drawImage + 视口框
  useEffect(() => {
    const c = canvasRef.current;
    const sc = staticCanvasRef.current;
    const t = transformRef.current;
    if (!c || !sc || !t) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    // 静态 canvas 尺寸可能是 dpr 倍，这里按目标尺寸绘制即可
    ctx.drawImage(sc, 0, 0, width, height);

    const cam = camera;
    const vwWorld = viewport.w / cam.zoom;
    const vhWorld = viewport.h / cam.zoom;
    const vx = t.offsetX + (cam.x - t.minX) * t.scale;
    const vy = t.offsetY + (cam.y - t.minY) * t.scale;
    const vw = vwWorld * t.scale;
    const vh = vhWorld * t.scale;
    ctx.strokeStyle = cssVar('--im-minimap-viewport', 'rgba(255,255,255,0.75)');
    ctx.lineWidth = 1;
    ctx.strokeRect(vx, vy, vw, vh);
  }, [camera, width, height, viewport.w, viewport.h, nodes.length, themeVersion, staticVersion]);

  // 拖拽视口框（window 监听）
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

      commitCamera(
        { x: dragRef.current.startCamX + worldDx, y: dragRef.current.startCamY + worldDy, zoom: cameraRef.current.zoom },
        true
      );
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
  }, [cameraRef, commitCamera]);

  const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
    const canvas = canvasRef.current;
    const t = transformRef.current;
    if (!canvas || !t) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (nodes.length === 0) return;

    const cam = cameraRef.current;
    const vwWorld = viewport.w / cam.zoom;
    const vhWorld = viewport.h / cam.zoom;

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

  const stats = useMemo(() => {
    return `rendered ${visibleCount}/${totalCount} · in view ${inViewCount} · zoom ${camera.zoom.toFixed(2)}`;
  }, [camera.zoom, inViewCount, totalCount, visibleCount]);

  return (
    <div
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
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        style={{ display: 'block', cursor: 'pointer' }}
      />
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
