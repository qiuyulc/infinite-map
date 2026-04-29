/* eslint-disable react-refresh/only-export-components */
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { STORE_KEYS, type InfiniteMapPlugin, type MapContext } from '@qiuyulc/infinite-map';
import './toolbar.css';
import './scrollbar.css';

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
   * 最大宽度（像素），超出时横向滚动（默认 520）
   */
  maxWidthPx?: number;
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

function mergeToolbarItems(base: ToolbarItem[], extra: ToolbarItem[]) {
  if (!extra.length) return base;
  const out: ToolbarItem[] = [];
  const indexById = new Map<string, number>();
  const push = (it: ToolbarItem) => {
    if (it.type === 'command') {
      const idx = indexById.get(it.id);
      if (idx != null) out[idx] = it; // 允许覆盖默认项（同 id 覆盖）
      else {
        indexById.set(it.id, out.length);
        out.push(it);
      }
      return;
    }
    out.push(it);
  };
  base.forEach(push);
  // base 与 extra 之间自动补一个 divider（避免挤在一起）
  const needDivider =
    base.length > 0 &&
    extra.length > 0 &&
    base[base.length - 1]?.type !== 'divider' &&
    extra[0]?.type !== 'divider';
  if (needDivider) out.push({ type: 'divider' });
  extra.forEach(push);
  // 规范化 divider：去掉首尾 divider + 合并连续 divider
  const normalized: ToolbarItem[] = [];
  for (const it of out) {
    if (it.type === 'divider') {
      if (normalized.length === 0) continue;
      if (normalized[normalized.length - 1]?.type === 'divider') continue;
      normalized.push(it);
      continue;
    }
    normalized.push(it);
  }
  if (normalized[normalized.length - 1]?.type === 'divider') normalized.pop();
  return normalized;
}

const ToolbarOverlay = memo(function ToolbarOverlay({ ctx, opts }: { ctx: MapContext; opts: ToolbarPluginOptions }) {
  const position = opts.position ?? 'top-left';
  const maxWidthPx = opts.maxWidthPx ?? 520;
  const baseItems = useMemo(() => opts.items ?? defaultItems(), [opts.items]);
  const extraItems = ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems) ?? [];
  const items = useMemo(() => mergeToolbarItems(baseItems, extraItems), [baseItems, extraItems]);

  // 订阅 enable 状态变化（history + selection）
  const [, bump] = useState(0);
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(ctx.store.subscribe(STORE_KEYS.historyUndoStack, () => bump((v) => v + 1)));
    unsubs.push(ctx.store.subscribe(STORE_KEYS.historyRedoStack, () => bump((v) => v + 1)));
    // items registry 变化时刷新（便于插件在运行时动态注入/热更新）
    unsubs.push(ctx.store.subscribe(STORE_KEYS.toolbarItems, () => bump((v) => v + 1)));
    unsubs.push(ctx.bus.on('selection:change', () => bump((v) => v + 1)));
    return () => unsubs.forEach((u) => u());
  }, [ctx]);

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
    boxSizing: 'border-box',
    maxWidth: maxWidthPx,
    overflowX: 'auto',
    overflowY: 'hidden',
    whiteSpace: 'nowrap',
  };

  const btn: CSSProperties = {
    height: 32,
    minWidth: 32,
    padding: '0 10px',
    borderRadius: 10,
    border: '1px solid var(--im-toolbar-btn-border, rgba(15,23,42,0.12))',
    background: 'var(--im-toolbar-btn-bg, rgba(255,255,255,0.75))',
    color: 'var(--im-toolbar-btn-text, rgba(15,23,42,0.85))',
    fontSize: 12,
    lineHeight: '32px',
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

  return (
    <div
      style={base}
      data-im-ui
      className="im-scrollbar"
      onWheelCapture={(e) => {
        // toolbar 自身可滚动（overflow:auto），避免 wheel 冒泡导致地图缩放/平移
        e.stopPropagation();
      }}
    >
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
  );
});

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
    overlay: ({ ctx }) => {
      if (ctx.store.get<boolean>(STORE_KEYS.editEnabled) === false) return null;
      return <ToolbarOverlay ctx={ctx} opts={opts} />;
    },
  };
}
