/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { STORE_KEYS } from '../keys';
import type { InfiniteMapPlugin, MapContext } from '../types';
import type { ContextMenuPayload } from './createContextMenuPlugin';
import { createContextMenuPlugin } from './createContextMenuPlugin';

type MenuItem =
  | { type: 'command'; id: string; label: string; enabled?: (ctx: MapContext, s: ContextMenuPayload) => boolean }
  | { type: 'divider' };

export type DefaultContextMenuOptions = {
  items?: MenuItem[];
};

function run(ctx: MapContext, id: string) {
  if (ctx.runCommand) {
    ctx.runCommand(id, { source: 'menu' });
    return;
  }
  const reg = ctx.store.get<Record<string, { run: (c: MapContext, p?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api' }) => void }>>(
    'commands:registry'
  );
  const cmd = reg?.[id];
  if (cmd) cmd.run(ctx, { source: 'menu' });
  else ctx.bus.emit('command:run', { id, source: 'menu' });
}

function defaultItems(): MenuItem[] {
  return [
    { type: 'command', id: 'edit.copy', label: 'Copy' },
    { type: 'command', id: 'edit.cut', label: 'Cut' },
    { type: 'command', id: 'edit.paste', label: 'Paste' },
    { type: 'command', id: 'edit.duplicate', label: 'Duplicate' },
    { type: 'divider' },
    { type: 'command', id: 'z.bringToFront', label: 'Bring to front' },
    { type: 'command', id: 'z.sendToBack', label: 'Send to back' },
    { type: 'divider' },
    { type: 'command', id: 'view.fitView', label: 'Fit view' },
    { type: 'command', id: 'view.centerView', label: 'Center view' },
    { type: 'command', id: 'view.fitSelection', label: 'Fit selection' },
    { type: 'command', id: 'view.centerSelection', label: 'Center selection' },
    { type: 'divider' },
    {
      type: 'command',
      id: 'edit.delete',
      label: 'Delete',
      enabled: (_ctx, s) => s.selectionIds.length > 0,
    },
  ];
}

function MenuOverlay({ ctx, opts }: { ctx: MapContext; opts: DefaultContextMenuOptions }) {
  const payload = ctx.store.get<ContextMenuPayload>(STORE_KEYS.contextMenuState) ?? null;
  const items = useMemo(() => opts.items ?? defaultItems(), [opts.items]);
  const ref = useRef<HTMLDivElement | null>(null);
  const [, bump] = useState(0);

  // 当 menu 打开/selection 变化时刷新 enabled 状态
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(ctx.store.subscribe(STORE_KEYS.contextMenuState, () => bump((v) => v + 1)));
    unsubs.push(ctx.bus.on('selection:change', () => bump((v) => v + 1)));
    return () => unsubs.forEach((u) => u());
  }, [ctx]);

  // 点击空白/按 ESC 关闭
  useEffect(() => {
    if (!payload) return;
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const t = e.target as Node | null;
      if (t && el.contains(t)) return;
      ctx.store.set(STORE_KEYS.contextMenuState, null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ctx.store.set(STORE_KEYS.contextMenuState, null);
    };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [ctx, payload]);

  if (!payload) return null;

  const panel: CSSProperties = {
    position: 'fixed',
    left: payload.screen.x,
    top: payload.screen.y,
    minWidth: 200,
    padding: 6,
    borderRadius: 12,
    background: 'var(--im-menu-bg, rgba(255,255,255,0.88))',
    border: '1px solid var(--im-menu-border, rgba(15,23,42,0.12))',
    boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
    backdropFilter: 'blur(8px)',
    color: 'var(--im-menu-text, rgba(15,23,42,0.85))',
    pointerEvents: 'auto',
    zIndex: 9999,
  };

  const item: CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 12,
  };

  const itemDisabled: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };

  const divider: CSSProperties = {
    height: 1,
    background: 'rgba(15,23,42,0.10)',
    margin: '6px 6px',
  };

  return (
    <div ref={ref} style={panel} data-im-ui>
      {items.map((it, i) => {
        if (it.type === 'divider') return <div key={`d-${i}`} style={divider} />;
        const enabled = it.enabled ? it.enabled(ctx, payload) : true;
        return (
          <button
            key={it.id}
            type="button"
            style={{ ...item, ...(enabled ? null : itemDisabled) }}
            disabled={!enabled}
            onClick={() => {
              if (!enabled) return;
              run(ctx, it.id);
              ctx.store.set(STORE_KEYS.contextMenuState, null);
            }}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 默认右键菜单（可选加载）
 * - 包含 headless 的 contextmenu 事件处理 + 一个默认 UI overlay
 */
export function createDefaultContextMenuPlugin(opts: DefaultContextMenuOptions = {}): InfiniteMapPlugin {
  const base = createContextMenuPlugin();
  return {
    id: 'contextmenu-ui',
    // 同时提供 contextmenu 能力，避免用户只加载 “默认菜单” 时 composePlugins 报 requires 缺失
    provides: ['contextmenu', 'contextmenu-ui'],
    requires: ['commands', 'selection'],
    slot: 'hud',
    overlayPointerEvents: 'auto',
    handlers: base.handlers, // 复用右键事件处理（写入 store）
    overlay: ({ ctx }) => <MenuOverlay ctx={ctx} opts={opts} />,
  };
}
