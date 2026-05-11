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
      label: string;
      title?: string;
      icon?: ReactNode;
      iconOnly?: boolean;
      enabled?: (ctx: MapContext) => boolean;
    }
  | { type: 'divider' };

export type ToolbarPluginOptions = {
  /**
   * 自定义工具栏按钮
   * - 不传：使用默认全套
   * - 传 string[]：按 key 排列（'|' = divider），内置 key 见文档
   * - 传 (string | ToolbarItem)[]：混合内置 key 和自定义项
   */
  items?: (string | ToolbarItem)[];
  position?: 'top-left' | 'top-right';
  maxWidthPx?: number;
};

function run(ctx: MapContext, id: string) {
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

// ---- 内置图标 ----
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

// ---- 内置按钮定义（commandId → ToolbarItem）----
const BUILTIN_ITEMS: Record<string, ToolbarItem> = {
  'history.undo': {
    type: 'command',
    id: 'history.undo',
    label: '撤销',
    title: '撤销（Ctrl/⌘+Z）',
    icon: Icons.undo,
    iconOnly: true,
    enabled: (ctx) => (ctx.store.get<unknown[]>(STORE_KEYS.historyUndoStack)?.length ?? 0) > 0,
  },
  'history.redo': {
    type: 'command',
    id: 'history.redo',
    label: '重做',
    title: '重做（Ctrl/⌘+Shift+Z）',
    icon: Icons.redo,
    iconOnly: true,
    enabled: (ctx) => (ctx.store.get<unknown[]>(STORE_KEYS.historyRedoStack)?.length ?? 0) > 0,
  },
  'view.zoomOut': {
    type: 'command',
    id: 'view.zoomOut',
    label: '缩小',
    title: '缩小',
    icon: Icons.zoomOut,
    iconOnly: true,
  },
  'view.zoomIn': {
    type: 'command',
    id: 'view.zoomIn',
    label: '放大',
    title: '放大',
    icon: Icons.zoomIn,
    iconOnly: true,
  },
  'view.resetZoom': {
    type: 'command',
    id: 'view.resetZoom',
    label: '100%',
    title: '重置缩放（100%）',
    icon: Icons.resetZoom,
    iconOnly: true,
  },
  'view.fitView': {
    type: 'command',
    id: 'view.fitView',
    label: '适配',
    title: '适配视图（让全部节点进入视口）',
    icon: Icons.fit,
    iconOnly: true,
  },
  'view.centerView': {
    type: 'command',
    id: 'view.centerView',
    label: '居中',
    title: '原点居中（让 0,0 在视口中心）',
    icon: Icons.center,
    iconOnly: true,
  },
  'edit.delete': {
    type: 'command',
    id: 'edit.delete',
    label: '删除',
    title: '删除（Backspace/Delete）',
    icon: Icons.trash,
    iconOnly: true,
    enabled: (ctx) => (ctx.getService<{ getIds: () => string[] }>('selection')?.getIds()?.length ?? 0) > 0,
  },
};

const DIVIDER: ToolbarItem = { type: 'divider' };

function resolveItems(input: (string | ToolbarItem)[]): ToolbarItem[] {
  const out: ToolbarItem[] = [];
  for (const it of input) {
    if (typeof it === 'string') {
      if (it === '|') {
        out.push(DIVIDER);
        continue;
      }
      const builtin = BUILTIN_ITEMS[it];
      if (builtin) {
        out.push(builtin);
        continue;
      }
      // unknown key — silently skip
      continue;
    }
    out.push(it);
  }
  // trim leading/trailing dividers + collapse consecutive dividers
  const clean: ToolbarItem[] = [];
  for (const it of out) {
    if (it.type === 'divider') {
      if (clean.length === 0) continue;
      if (clean[clean.length - 1]?.type === 'divider') continue;
      clean.push(it);
      continue;
    }
    clean.push(it);
  }
  if (clean[clean.length - 1]?.type === 'divider') clean.pop();
  return clean;
}

function defaultItems(): ToolbarItem[] {
  return resolveItems([
    'history.undo',
    'history.redo',
    '|',
    'view.zoomOut',
    'view.zoomIn',
    'view.resetZoom',
    '|',
    'view.fitView',
    'view.centerView',
    '|',
    'edit.delete',
  ]);
}

function mergeToolbarItems(base: ToolbarItem[], extra: ToolbarItem[]) {
  if (!extra.length) return base;
  const out: ToolbarItem[] = [];
  const indexById = new Map<string, number>();
  const push = (it: ToolbarItem) => {
    if (it.type === 'command') {
      const idx = indexById.get(it.id);
      if (idx != null) out[idx] = it;
      else {
        indexById.set(it.id, out.length);
        out.push(it);
      }
      return;
    }
    out.push(it);
  };
  base.forEach(push);
  const needDivider =
    base.length > 0 &&
    extra.length > 0 &&
    base[base.length - 1]?.type !== 'divider' &&
    extra[0]?.type !== 'divider';
  if (needDivider) out.push({ type: 'divider' });
  extra.forEach(push);
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
  const baseItems = useMemo(
    () => (opts.items ? resolveItems(opts.items) : defaultItems()),
    [opts.items],
  );
  const extraItems = ctx.store.get<ToolbarItem[]>(STORE_KEYS.toolbarItems) ?? [];
  const items = useMemo(() => mergeToolbarItems(baseItems, extraItems), [baseItems, extraItems]);
  const [tip, setTip] = useState<null | { text: string; left: number; top: number }>(null);

  const [, bump] = useState(0);
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(ctx.store.subscribe(STORE_KEYS.historyUndoStack, () => bump((v) => v + 1)));
    unsubs.push(ctx.store.subscribe(STORE_KEYS.historyRedoStack, () => bump((v) => v + 1)));
    unsubs.push(ctx.store.subscribe(STORE_KEYS.toolbarItems, () => bump((v) => v + 1)));
    unsubs.push(ctx.bus.on('selection:change', () => bump((v) => v + 1)));
    return () => unsubs.forEach((u) => u());
  }, [ctx]);

  const base: CSSProperties = {
    position: 'absolute',
    top: 36,
    left: position === 'top-left' ? 30 : undefined,
    right: position === 'top-right' ? 30 : undefined,
    padding: '8px 14px',
    borderRadius: 12,
    background: 'var(--im-toolbar-bg, rgba(255,255,255,0.72))',
    border: '1px solid var(--im-toolbar-border, rgba(15,23,42,0.12))',
    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(6px)',
    pointerEvents: 'auto',
    userSelect: 'none',
    boxSizing: 'border-box',
    maxWidth: maxWidthPx,
    overflow: 'hidden',
  };

  const scroll: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflowX: 'auto',
    overflowY: 'hidden',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
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
    flex: '0 0 1px',
    alignSelf: 'center',
  };

  return (
    <div style={base} data-im-ui>
      <div
        style={scroll}
        className="im-scrollbar"
        onScroll={() => setTip(null)}
        onWheelCapture={(e) => {
          e.stopPropagation();
        }}
      >
        {items.map((it, i) => {
          if (it.type === 'divider') return <div key={`d-${i}`} style={divider} />;
          const enabled = it.enabled ? it.enabled(ctx) : true;
          const iconOnly = it.icon != null && (it.iconOnly ?? true);
          const tipText = it.title ?? it.label;
          return (
            <button
              key={it.id}
              type="button"
              style={{ ...btn, ...(iconOnly ? btnIcon : null), ...(enabled ? null : btnDisabled) }}
              disabled={!enabled}
              title={tipText}
              onPointerEnter={(e) => {
                if (!enabled) return;
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setTip({ text: tipText, left: r.left + r.width / 2, top: r.bottom + 10 });
              }}
              onPointerLeave={() => setTip(null)}
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

      <div className="im-toolbar-tooltip" data-show={tip ? '1' : '0'} style={{ left: tip?.left ?? -9999, top: tip?.top ?? -9999 }}>
        {tip?.text ?? ''}
      </div>
    </div>
  );
});

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
