/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, type CSSProperties } from 'react';
import { Slider } from '../components/Slider';
import { STORE_KEYS, type Camera, type InfiniteMapPlugin, type MapContext } from '@qiuyulc/infinite-map';
import { getViewLimits } from './createViewCommandsPlugin';

export type ZoomDockPluginOptions = {
  /**
   * 是否展示缩放滑杆（默认 true）
   */
  enabled?: boolean;
  /**
   * slider 宽度（默认 140）
   */
  sliderWidth?: number;
  /**
   * 与 minimap 的间距（默认 10）
   */
  gapPx?: number;
  /**
   * dock 高度（默认 36）
   */
  heightPx?: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function ZoomDockOverlay({ ctx, opts }: { ctx: MapContext; opts: ZoomDockPluginOptions }) {
  const enabled = opts.enabled ?? true;
  const sliderWidth = opts.sliderWidth ?? 140;
  const gapPx = opts.gapPx ?? 10;
  const heightPx = opts.heightPx ?? 36;

  const [, bump] = useState(0);
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(ctx.bus.on('camera:changed', () => bump((v) => v + 1)));
    unsubs.push(ctx.store.subscribe(STORE_KEYS.viewConfig, () => bump((v) => v + 1)));
    return () => unsubs.forEach((u) => u());
  }, [ctx]);

  if (!enabled) return null;

  const cam = ctx.getCamera();
  const { minZoom, maxZoom } = getViewLimits(ctx);

  // slider 用对数映射（更符合缩放直觉）
  const logMin = Math.log(minZoom);
  const logMax = Math.log(maxZoom);
  const zoomToSlider = (z: number) => {
    const t = (Math.log(clamp(z, minZoom, maxZoom)) - logMin) / (logMax - logMin);
    return Math.round(clamp(t, 0, 1) * 100);
  };
  const sliderToZoom = (v: number) => {
    const t = clamp(v / 100, 0, 1);
    return Math.exp(logMin + (logMax - logMin) * t);
  };

  const setZoom = (nextZoom: number) => {
    const z = clamp(nextZoom, minZoom, maxZoom);
    const vp = ctx.getViewport();
    const curZoom = cam.zoom || 1;
    // 保持视口中心在同一个 world point，避免缩放时漂移
    const cx = cam.x + vp.w / 2 / curZoom;
    const cy = cam.y + vp.h / 2 / curZoom;
    const next: Camera = { x: cx - vp.w / 2 / z, y: cy - vp.h / 2 / z, zoom: z };
    const svc = ctx.getService<{ set: (c: Camera, immediate?: boolean) => void }>('camera');
    if (svc?.set) svc.set(next, true);
    else ctx.bus.emit('camera:change', { camera: next, immediate: true });
  };

  const minimap = ctx.getService<{ enabled: () => boolean; getConfig: () => { width: number } }>('minimap');
  const minimapEnabled = minimap?.enabled?.() === true;
  const minimapW = minimapEnabled ? minimap?.getConfig?.().width ?? 260 : 0;

  const dock: CSSProperties = {
    position: 'absolute',
    // minimap 显示：放在 minimap 左侧；minimap 关闭：占用 minimap 的位置（避免右下角空一块）
    right: 12 + (minimapEnabled ? minimapW + gapPx : 0),
    bottom: 12,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: heightPx,
    padding: '0 10px',
    borderRadius: 12,
    background: 'var(--im-toolbar-bg, rgba(255,255,255,0.72))',
    border: '1px solid var(--im-toolbar-border, rgba(15,23,42,0.12))',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(6px)',
    pointerEvents: 'auto',
    userSelect: 'none',
  };

  const sliderWrap: CSSProperties = { width: sliderWidth, flexShrink: 0 };

  const label: CSSProperties = {
    width: 48,
    flexShrink: 0,
    textAlign: 'right',
    fontSize: 12,
    color: 'var(--im-toolbar-btn-text, rgba(15,23,42,0.85))',
    opacity: 0.9,
    userSelect: 'none',
    lineHeight: 1,
  };

  return (
    <div style={dock} data-im-ui>
      <div style={sliderWrap}>
        <Slider
          value={zoomToSlider(cam.zoom || 1)}
          min={0}
          max={100}
          step={1}
          label="缩放"
          formatValue={(v) => `${Math.round(sliderToZoom(v) * 100)}%`}
          onChange={(v) => setZoom(sliderToZoom(v))}
        />
      </div>
      <div style={label}>{Math.round((cam.zoom || 1) * 100)}%</div>
    </div>
  );
}

export function createZoomDockPlugin(opts: ZoomDockPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'zoomDock',
    provides: ['zoomDock'],
    requires: ['camera'],
    slot: 'hud',
    overlayPointerEvents: 'auto',
    overlay: ({ ctx }) => <ZoomDockOverlay ctx={ctx} opts={opts} />,
  };
}
