/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { STORE_KEYS } from '../../keys';
import type { InfiniteMapPlugin, MapContext } from '../../types';
import './toolbar.css';

export type ToolbarItem =
  | {
      type: 'command';
      id: string;
      /**
       * 按钮文案（用于 tooltip / 无 icon 回退）
       */
      label: string;
      /**
       * tooltip 文案（未提供时回退 label）
       */
      title?: string;
      /**
       * 可选图标（推荐）
       */
      icon?: ReactNode;
      /**
       * 是否只显示图标（默认 true；更像编辑器）
       */
      iconOnly?: boolean;
      enabled?: (ctx: MapContext) => boolean;
    }
  | { type: 'divider' };

export type ToolbarPluginOptions = {
  /**
   * 自定义工具栏按钮
   * - 默认包含：undo/redo、zoom、fit/center、delete
   */
  items?: ToolbarItem[];
  position?: 'top-left' | 'top-right';
  /**
   * 是否展示缩放滑杆（默认 true）
   */
  zoomSliderEnabled?: boolean;
};

function run(ctx: MapContext, id: string) {
  // 优先走 command runner；否则退化为直接从 registry 取命令执行（避免 “runner 未 setup” 导致无响应）
  if (ctx.runCommand) {
    ctx.runCommand(id, { source: 'toolbar' });
    return;
  }
  const reg = ctx.store.get<Record<string, { run: (c: MapContext, p?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api' }) => void }>>(
    'commands:registry'
  );
  const cmd = reg?.[id];
  if (cmd) cmd.run(ctx, { source: 'toolbar' });
  else ctx.bus.emit('command:run', { id, source: 'toolbar' });
}

function Icon({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {children}
    </svg>
  );
}

// 简单内置 icon：避免引入额外依赖
const Icons = {
  undo: (
    <Icon>
      <path d="M9 14l-4-4 4-4" />
      <path d="M5 10h9a5 5 0 1 1 0 10h-1" />
    </Icon>
  ),
  redo: (
    <Icon>
      <path d="M15 14l4-4-4-4" />
      <path d="M19 10H10a5 5 0 1 0 0 10h1" />
    </Icon>
  ),
  zoomIn: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </Icon>
  ),
  zoomOut: (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M8 11h6" />
    </Icon>
  ),
  resetZoom: (
    <Icon>
      {/* 重置缩放（100%）：放大镜 + 回环箭头，避免与“新增/加号”混淆 */}
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M9 11a2.5 2.5 0 1 1 1.1 2" />
      <path d="M10.2 13H8v-2.2" />
    </Icon>
  ),
  fit: (
    <Icon>
      <path d="M4 9V6a2 2 0 0 1 2-2h3" />
      <path d="M20 9V6a2 2 0 0 0-2-2h-3" />
      <path d="M4 15v3a2 2 0 0 0 2 2h3" />
      <path d="M20 15v3a2 2 0 0 1-2 2h-3" />
    </Icon>
  ),
  center: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
    </Icon>
  ),
  trash: (
    <Icon>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 14h8l1-14" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Icon>
  ),
} as const;

function defaultItems(): ToolbarItem[] {
  return [
    {
      type: 'command',
      id: 'history.undo',
      label: '撤销',
      title: '撤销（Ctrl/⌘+Z）',
      icon: Icons.undo,
      iconOnly: true,
      enabled: (ctx) => (ctx.store.get<unknown[]>(STORE_KEYS.historyUndoStack)?.length ?? 0) > 0,
    },
    {
      type: 'command',
      id: 'history.redo',
      label: '重做',
      title: '重做（Ctrl/⌘+Shift+Z）',
      icon: Icons.redo,
      iconOnly: true,
      enabled: (ctx) => (ctx.store.get<unknown[]>(STORE_KEYS.historyRedoStack)?.length ?? 0) > 0,
    },
    { type: 'divider' },
    { type: 'command', id: 'view.zoomOut', label: '缩小', title: '缩小', icon: Icons.zoomOut, iconOnly: true },
    { type: 'command', id: 'view.zoomIn', label: '放大', title: '放大', icon: Icons.zoomIn, iconOnly: true },
    { type: 'command', id: 'view.resetZoom', label: '100%', title: '重置缩放（100%）', icon: Icons.resetZoom, iconOnly: true },
    { type: 'divider' },
    { type: 'command', id: 'view.fitView', label: '适配', title: '适配视图（让全部节点进入视口）', icon: Icons.fit, iconOnly: true },
    { type: 'command', id: 'view.centerView', label: '居中', title: '原点居中（让 0,0 在视口中心）', icon: Icons.center, iconOnly: true },
    { type: 'divider' },
    {
      type: 'command',
      id: 'edit.delete',
      label: '删除',
      title: '删除（Backspace/Delete）',
      icon: Icons.trash,
      iconOnly: true,
      enabled: (ctx) => (ctx.getService<{ getIds: () => string[] }>('selection')?.getIds()?.length ?? 0) > 0,
    },
  ];
}

function ToolbarOverlay({ ctx, opts }: { ctx: MapContext; opts: ToolbarPluginOptions }) {
  const position = opts.position ?? 'top-left';
  const items = useMemo(() => opts.items ?? defaultItems(), [opts.items]);
  const zoomSliderEnabled = opts.zoomSliderEnabled ?? true;

  // 订阅 enable 状态变化（history + selection）
  const [, bump] = useState(0);
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(ctx.store.subscribe(STORE_KEYS.historyUndoStack, () => bump((v) => v + 1)));
    unsubs.push(ctx.store.subscribe(STORE_KEYS.historyRedoStack, () => bump((v) => v + 1)));
    unsubs.push(ctx.bus.on('selection:change', () => bump((v) => v + 1)));
    // zoom 变化时刷新 slider 值
    unsubs.push(ctx.bus.on('camera:changed', () => bump((v) => v + 1)));
    return () => unsubs.forEach((u) => u());
  }, [ctx]);

  const cam = ctx.getCamera();
  const viewCfg =
    ctx.store.get<{
      minZoom?: number;
      maxZoom?: number;
    }>(STORE_KEYS.viewConfig) ?? {};
  const minZoom = viewCfg.minZoom ?? 0.25;
  const maxZoom = viewCfg.maxZoom ?? 2.5;
  const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

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
    // 保持视口中心在同一个 world point，避免缩放时“飘走”
    const cx = cam.x + vp.w / 2 / curZoom;
    const cy = cam.y + vp.h / 2 / curZoom;
    const next = { x: cx - vp.w / 2 / z, y: cy - vp.h / 2 / z, zoom: z };
    const svc = ctx.getService<{ set: (c: typeof next, immediate?: boolean) => void }>('camera');
    if (svc?.set) svc.set(next, true);
    else ctx.bus.emit('camera:change', { camera: next, immediate: true });
  };

  const base: CSSProperties = {
    position: 'absolute',
    top: 36,
    left: position === 'top-left' ? 30 : undefined,
    right: position === 'top-right' ? 30 : undefined,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 8px',
    borderRadius: 12,
    background: 'var(--im-toolbar-bg, rgba(255,255,255,0.72))',
    border: '1px solid var(--im-toolbar-border, rgba(15,23,42,0.12))',
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(6px)',
    pointerEvents: 'auto',
    userSelect: 'none',
  };

  const btn: CSSProperties = {
    height: 30,
    padding: '0 10px',
    borderRadius: 10,
    border: '1px solid var(--im-toolbar-btn-border, rgba(15,23,42,0.12))',
    background: 'var(--im-toolbar-btn-bg, rgba(255,255,255,0.75))',
    color: 'var(--im-toolbar-btn-text, rgba(15,23,42,0.85))',
    fontSize: 12,
    cursor: 'pointer',
  };
  const btnIcon: CSSProperties = {
    width: 32,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const btnDisabled: CSSProperties = {
    opacity: 0.45,
    cursor: 'not-allowed',
  };

  const divider: CSSProperties = {
    width: 1,
    height: 18,
    background: 'rgba(15,23,42,0.12)',
    margin: '0 2px',
  };

  const minimapCfg = (ctx.store.get<{ width?: number; height?: number }>(STORE_KEYS.minimapConfig) ?? {}) as {
    width?: number;
    height?: number;
  };
  const minimapW = minimapCfg.width ?? 260;
  const minimapH = minimapCfg.height ?? 160;
  const zoomDockH = 36;
  const zoomDockGap = 10;

  const zoomDock: CSSProperties = {
    position: 'absolute',
    // 放在 minimap 左侧，水平挨着
    right: 12 + minimapW + zoomDockGap,
    bottom: 12 + Math.max(0, (minimapH - zoomDockH) / 2),
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: zoomDockH,
    padding: '0 10px',
    borderRadius: 12,
    background: 'var(--im-toolbar-bg, rgba(255,255,255,0.72))',
    border: '1px solid var(--im-toolbar-border, rgba(15,23,42,0.12))',
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(6px)',
    pointerEvents: 'auto',
    userSelect: 'none',
  };
  const zoomLabel: CSSProperties = {
    fontSize: 12,
    color: 'var(--im-toolbar-btn-text, rgba(15,23,42,0.85))',
    opacity: 0.9,
    userSelect: 'none',
    lineHeight: 1,
  };
  const zoomSlider: CSSProperties = {
    width: 140,
    accentColor: 'var(--im-selection-stroke, rgba(110, 200, 255, 0.95))',
  };

  return (
    <>
      {zoomSliderEnabled ? (
        <div style={zoomDock} data-im-ui>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={zoomToSlider(cam.zoom || 1)}
            style={zoomSlider}
            aria-label="缩放"
            onChange={(e) => setZoom(sliderToZoom(Number(e.target.value)))}
          />
          <div style={zoomLabel}>{Math.round((cam.zoom || 1) * 100)}%</div>
        </div>
      ) : null}

      <div style={base} data-im-ui>
        {items.map((it, i) => {
        if (it.type === 'divider') return <div key={`d-${i}`} style={divider} />;
        const enabled = it.enabled ? it.enabled(ctx) : true;
        const iconOnly = it.icon != null && (it.iconOnly ?? true);
        return (
          <button
            key={it.id}
            type="button"
            style={{ ...btn, ...(iconOnly ? btnIcon : null), ...(enabled ? null : btnDisabled) }}
            disabled={!enabled}
            className="im-toolbar-btn"
            data-tip={it.title ?? it.label}
            onClick={() => (enabled ? run(ctx, it.id) : null)}
          >
            {it.icon ? (
              <>
                {it.icon}
                {iconOnly ? null : <span style={{ marginLeft: 6 }}>{it.label}</span>}
              </>
            ) : (
              it.label
            )}
          </button>
        );
        })}
      </div>
    </>
  );
}

/**
 * 默认工具栏（可选加载）
 * - 使用 commands 驱动：同一套命令可被快捷键/菜单复用
 */
export function createToolbarPlugin(opts: ToolbarPluginOptions = {}): InfiniteMapPlugin {
  return {
    id: 'toolbar',
    provides: ['toolbar'],
    requires: ['commands'],
    slot: 'hud',
    overlayPointerEvents: 'auto',
    overlay: ({ ctx }) => <ToolbarOverlay ctx={ctx} opts={opts} />,
  };
}
