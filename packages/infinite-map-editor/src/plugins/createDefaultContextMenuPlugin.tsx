/* eslint-disable react-refresh/only-export-components */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CSSProperties } from 'react';
import { STORE_KEYS, type InfiniteMapPlugin, type MapContext } from '@qiuyulc/infinite-map';
import type { ContextMenuPayload } from './createContextMenuPlugin';
import { createContextMenuPlugin } from './createContextMenuPlugin';
import './scrollbar.css';

export type ContextMenuItem =
  | {
      type: 'command';
      id: string;
      label: string;
      icon?: ReactNode;
      /**
       * 快捷键提示（仅用于 UI 展示）
       * - 例：Mod+C、Shift+Mod+G、Delete
       */
      shortcut?: string;
      enabled?: (ctx: MapContext, s: ContextMenuPayload) => boolean;
    }
  | { type: 'divider' };

export type DefaultContextMenuOptions = {
  /**
   * 自定义菜单项
   * - 不传：使用默认全套
   * - 传 string[]：按 key 排列（'|' = divider）
   * - 传 (string | ContextMenuItem)[]：混合内置 key 和自定义项
   */
  items?: (string | ContextMenuItem)[];
  /**
   * 最大宽度（像素），超出时内容省略/滚动（默认 320）
   */
  maxWidthPx?: number;
  /**
   * 最大高度（像素），超出时纵向滚动（默认 420）
   */
  maxHeightPx?: number;
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

function defaultItems(): ContextMenuItem[] {
  const Icon = ({ children }: { children: ReactNode }) => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {children}
    </svg>
  );
  const Icons = {
    copy: (
      <Icon>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </Icon>
    ),
    cut: (
      <Icon>
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4L8.12 15.88" />
        <path d="M14.47 14.48L20 20" />
        <path d="M8.12 8.12L12 12" />
      </Icon>
    ),
    paste: (
      <Icon>
        <path d="M19 21H10a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2Z" />
        <path d="M16 3H8" />
        <path d="M12 3v4" />
      </Icon>
    ),
    duplicate: (
      <Icon>
        <rect x="8" y="8" width="12" height="12" rx="2" />
        <path d="M4 16V4a2 2 0 0 1 2-2h12" />
      </Icon>
    ),
    front: (
      <Icon>
        <path d="M3 7h11" />
        <path d="M3 12h7" />
        <path d="M3 17h11" />
        <path d="M16 7l5 5-5 5" />
      </Icon>
    ),
    back: (
      <Icon>
        <path d="M21 7H10" />
        <path d="M21 12h-7" />
        <path d="M21 17H10" />
        <path d="M8 7 3 12l5 5" />
      </Icon>
    ),
    upOne: (
      <Icon>
        <path d="M12 5l-4 4" />
        <path d="M12 5l4 4" />
        <path d="M12 5v10" />
        <rect x="5" y="17" width="14" height="4" rx="1" />
      </Icon>
    ),
    downOne: (
      <Icon>
        <path d="M12 19l-4-4" />
        <path d="M12 19l4-4" />
        <path d="M12 9v10" />
        <rect x="5" y="3" width="14" height="4" rx="1" />
      </Icon>
    ),
    alignLeft: (
      <Icon>
        <path d="M5 4v16" />
        <path d="M8 7h12" />
        <path d="M8 12h9" />
        <path d="M8 17h12" />
      </Icon>
    ),
    alignHCenter: (
      <Icon>
        <path d="M12 4v16" />
        <path d="M6 7h12" />
        <path d="M7.5 12h9" />
        <path d="M6 17h12" />
      </Icon>
    ),
    alignRight: (
      <Icon>
        <path d="M19 4v16" />
        <path d="M4 7h12" />
        <path d="M7 12h9" />
        <path d="M4 17h12" />
      </Icon>
    ),
    alignTop: (
      <Icon>
        <path d="M4 5h16" />
        <path d="M7 8v12" />
        <path d="M12 8v9" />
        <path d="M17 8v12" />
      </Icon>
    ),
    alignVCenter: (
      <Icon>
        <path d="M4 12h16" />
        <path d="M7 6v12" />
        <path d="M12 7.5v9" />
        <path d="M17 6v12" />
      </Icon>
    ),
    alignBottom: (
      <Icon>
        <path d="M4 19h16" />
        <path d="M7 4v12" />
        <path d="M12 7v9" />
        <path d="M17 4v12" />
      </Icon>
    ),
    distributeH: (
      <Icon>
        <rect x="4" y="9" width="3" height="6" rx="1" />
        <rect x="10.5" y="9" width="3" height="6" rx="1" />
        <rect x="17" y="9" width="3" height="6" rx="1" />
        <path d="M8 12h8" />
        <path d="M10 10l-2 2 2 2" />
        <path d="M14 10l2 2-2 2" />
      </Icon>
    ),
    distributeV: (
      <Icon>
        <rect x="9" y="4" width="6" height="3" rx="1" />
        <rect x="9" y="10.5" width="6" height="3" rx="1" />
        <rect x="9" y="17" width="6" height="3" rx="1" />
        <path d="M12 8v8" />
        <path d="M10 10l2-2 2 2" />
        <path d="M10 14l2 2 2-2" />
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
    fitSelection: (
      <Icon>
        <path d="M4 9V6a2 2 0 0 1 2-2h3" />
        <path d="M20 9V6a2 2 0 0 0-2-2h-3" />
        <path d="M4 15v3a2 2 0 0 0 2 2h3" />
        <path d="M20 15v3a2 2 0 0 1-2 2h-3" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
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
    centerSelection: (
      <Icon>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </Icon>
    ),
    trash: (
      <Icon>
        <path d="M4 7h16" />
        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        <path d="M7 7l1 14h8l1-14" />
      </Icon>
    ),
  } as const;
  return [
    { type: 'command', id: 'edit.copy', label: '复制', icon: Icons.copy, shortcut: 'Mod+C' },
    { type: 'command', id: 'edit.cut', label: '剪切', icon: Icons.cut, shortcut: 'Mod+X' },
    { type: 'command', id: 'edit.paste', label: '粘贴', icon: Icons.paste, shortcut: 'Mod+V' },
    { type: 'command', id: 'edit.duplicate', label: '创建副本', icon: Icons.duplicate, shortcut: 'Mod+D' },
    { type: 'divider' },
    { type: 'command', id: 'z.bringToFront', label: '置于顶层', icon: Icons.front, enabled: (_c, s) => s.selectionIds.length > 0 },
    { type: 'command', id: 'z.bringForward', label: '上移一层', icon: Icons.upOne, enabled: (_c, s) => s.selectionIds.length > 0 },
    { type: 'command', id: 'z.sendBackward', label: '下移一层', icon: Icons.downOne, enabled: (_c, s) => s.selectionIds.length > 0 },
    { type: 'command', id: 'z.sendToBack', label: '置于底层', icon: Icons.back, enabled: (_c, s) => s.selectionIds.length > 0 },
    { type: 'divider' },
    // 对齐/分布（需要 align-distribute 插件注册 commands）
    { type: 'command', id: 'edit.alignLeft', label: '对齐：左', icon: Icons.alignLeft, enabled: (_c, s) => s.selectionIds.length >= 2 },
    { type: 'command', id: 'edit.alignHCenter', label: '对齐：水平居中', icon: Icons.alignHCenter, enabled: (_c, s) => s.selectionIds.length >= 2 },
    { type: 'command', id: 'edit.alignRight', label: '对齐：右', icon: Icons.alignRight, enabled: (_c, s) => s.selectionIds.length >= 2 },
    { type: 'command', id: 'edit.alignTop', label: '对齐：上', icon: Icons.alignTop, enabled: (_c, s) => s.selectionIds.length >= 2 },
    { type: 'command', id: 'edit.alignVCenter', label: '对齐：垂直居中', icon: Icons.alignVCenter, enabled: (_c, s) => s.selectionIds.length >= 2 },
    { type: 'command', id: 'edit.alignBottom', label: '对齐：下', icon: Icons.alignBottom, enabled: (_c, s) => s.selectionIds.length >= 2 },
    { type: 'divider' },
    { type: 'command', id: 'edit.distributeH', label: '分布：水平等间距', icon: Icons.distributeH, enabled: (_c, s) => s.selectionIds.length >= 3 },
    { type: 'command', id: 'edit.distributeV', label: '分布：垂直等间距', icon: Icons.distributeV, enabled: (_c, s) => s.selectionIds.length >= 3 },
    { type: 'divider' },
    { type: 'command', id: 'view.fitView', label: '适配视图', icon: Icons.fit },
    { type: 'command', id: 'view.centerView', label: '居中到原点', icon: Icons.center },
    { type: 'command', id: 'view.fitSelection', label: '适配选中', icon: Icons.fitSelection, enabled: (_c, s) => s.selectionIds.length > 0 },
    { type: 'command', id: 'view.centerSelection', label: '选中居中', icon: Icons.centerSelection, enabled: (_c, s) => s.selectionIds.length > 0 },
    { type: 'divider' },
    {
      type: 'command',
      id: 'edit.delete',
      label: '删除',
      icon: Icons.trash,
      shortcut: 'Delete / Backspace',
      enabled: (_ctx, s) => s.selectionIds.length > 0,
    },
  ];
}

function mergeMenuItems(base: ContextMenuItem[], extra: ContextMenuItem[]) {
  if (!extra.length) return base;
  const out: ContextMenuItem[] = [];
  const indexById = new Map<string, number>();
  const push = (it: ContextMenuItem) => {
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
  const normalized: ContextMenuItem[] = [];
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

// ---- Key-based items resolution ----
const BUILTIN_ITEMS: Record<string, ContextMenuItem> = {
  'edit.copy':       { type: 'command', id: 'edit.copy', label: '复制', shortcut: 'Mod+C' },
  'edit.cut':        { type: 'command', id: 'edit.cut', label: '剪切', shortcut: 'Mod+X' },
  'edit.paste':      { type: 'command', id: 'edit.paste', label: '粘贴', shortcut: 'Mod+V' },
  'edit.duplicate':  { type: 'command', id: 'edit.duplicate', label: '创建副本', shortcut: 'Mod+D' },
  'edit.delete':     { type: 'command', id: 'edit.delete', label: '删除', shortcut: '⌫' },
  'z.bringToFront':  { type: 'command', id: 'z.bringToFront', label: '置于顶层' },
  'z.bringForward':  { type: 'command', id: 'z.bringForward', label: '上移一层' },
  'z.sendBackward':  { type: 'command', id: 'z.sendBackward', label: '下移一层' },
  'z.sendToBack':    { type: 'command', id: 'z.sendToBack', label: '置于底层' },
  'edit.group':      { type: 'command', id: 'edit.group', label: '编组', shortcut: 'Mod+G' },
  'edit.ungroup':    { type: 'command', id: 'edit.ungroup', label: '解组', shortcut: 'Shift+Mod+G' },
  'edit.lock':       { type: 'command', id: 'edit.lock', label: '锁定' },
  'edit.unlock':     { type: 'command', id: 'edit.unlock', label: '解锁' },
  'edit.hide':       { type: 'command', id: 'edit.hide', label: '隐藏' },
  'edit.showAll':    { type: 'command', id: 'edit.showAll', label: '显示全部' },
  'view.fitView':    { type: 'command', id: 'view.fitView', label: '适配视图' },
  'view.centerView': { type: 'command', id: 'view.centerView', label: '居中到原点' },
  'view.fitSelection':    { type: 'command', id: 'view.fitSelection', label: '适配选中' },
  'view.centerSelection': { type: 'command', id: 'view.centerSelection', label: '选中居中' },
};

const DIVIDER: ContextMenuItem = { type: 'divider' };

function resolveItems(input: (string | ContextMenuItem)[]): ContextMenuItem[] {
  const out: ContextMenuItem[] = [];
  for (const it of input) {
    if (typeof it === 'string') {
      if (it === '|') { out.push(DIVIDER); continue; }
      const builtin = BUILTIN_ITEMS[it];
      if (builtin) { out.push(builtin); }
      continue;
    }
    out.push(it);
  }
  return out;
}

const MenuOverlay = memo(function MenuOverlay({ ctx, opts }: { ctx: MapContext; opts: DefaultContextMenuOptions }) {
  const editEnabled = ctx.store.get<boolean>(STORE_KEYS.editEnabled);
  const payload = ctx.store.get<ContextMenuPayload>(STORE_KEYS.contextMenuState) ?? null;
  const baseItems = useMemo(() => opts.items ? resolveItems(opts.items) : defaultItems(), [opts.items]);
  const extraItems = ctx.store.get<ContextMenuItem[]>(STORE_KEYS.contextMenuItems) ?? [];
  const items = useMemo(() => mergeMenuItems(baseItems, extraItems), [baseItems, extraItems]);
  const ref = useRef<HTMLDivElement | null>(null);
  const [, bump] = useState(0);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // 只读/无变更出口：禁用右键菜单（并确保关闭已打开的菜单）
  useEffect(() => {
    if (editEnabled === false) {
      if (ctx.store.get(STORE_KEYS.contextMenuState) != null) ctx.store.set(STORE_KEYS.contextMenuState, null);
    }
  }, [ctx, editEnabled]);

  // 当 menu 打开/selection 变化时刷新 enabled 状态
  useEffect(() => {
    // 注意：这里不能因为 editEnabled=false 而提前 return 组件，否则会触发
    // “Rendered fewer hooks than expected”。
    // hooks 必须在每次渲染中保持调用顺序一致，因此只在 effect 内部做条件判断即可。
    const unsubs: Array<() => void> = [];
    unsubs.push(ctx.store.subscribe(STORE_KEYS.contextMenuState, () => bump((v) => v + 1)));
    // items registry 变化时刷新（便于插件在运行时动态注入/热更新）
    unsubs.push(ctx.store.subscribe(STORE_KEYS.contextMenuItems, () => bump((v) => v + 1)));
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

  // 将全局 clientX/Y 转成容器内坐标，并限制不超出父容器（InfiniteMap root 的 overflow: hidden 会裁切）
  useLayoutEffect(() => {
    // 重要：hooks 必须始终按同样顺序调用。这里不要在 payload 为空时提前 return 组件。
    if (!payload) {
      setPos(null);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const root = el.offsetParent as HTMLElement | null; // 插件 hud 层是 absolute inset:0，正好是边界容器
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const menuRect = el.getBoundingClientRect();
    const rawLeft = payload.screen.x - rootRect.left;
    const rawTop = payload.screen.y - rootRect.top;
    const maxLeft = Math.max(0, rootRect.width - menuRect.width);
    const maxTop = Math.max(0, rootRect.height - menuRect.height);
    const left = Math.min(Math.max(0, rawLeft), maxLeft);
    const top = Math.min(Math.max(0, rawTop), maxTop);
    setPos({ left, top });
  }, [payload?.screen.x, payload?.screen.y, items.length]);

  // 只读/无变更出口：不渲染菜单 UI
  // 注意：该判断必须放在所有 hooks 之后（否则 hooks 数量在不同渲染间不一致）
  if (editEnabled === false || !payload) return null;

  const maxWidthPx = opts.maxWidthPx ?? 320;
  const maxHeightPx = opts.maxHeightPx ?? 420;
  const padX = 6;
  const padY = 8;
  // 上下留白要“固定在面板上”，不能作为 scroll 内容的一部分，否则滚动时会被卷走
  const innerMaxHeight = Math.max(120, maxHeightPx - padY * 2);

  const panel: CSSProperties = {
    position: 'absolute',
    left: pos?.left ?? 0,
    top: pos?.top ?? 0,
    minWidth: 170,
    maxWidth: maxWidthPx,
    maxHeight: maxHeightPx,
    // 固定上下留白：滚动时条目不会从边框“直接冒出来”
    padding: `${padY}px ${padX}px`,
    borderRadius: 10,
    // 与 toolbar tooltip/panel 保持一致：优先使用 im-panel-*，兼容旧的 im-menu-* 变量
    background: 'var(--im-panel-bg, var(--im-menu-bg, rgba(255,255,255,0.88)))',
    border: '1px solid var(--im-panel-border, var(--im-menu-border, rgba(15,23,42,0.12)))',
    boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
    backdropFilter: 'blur(8px)',
    color: 'var(--im-text-strong, var(--im-menu-text, rgba(15,23,42,0.85)))',
    pointerEvents: 'auto',
    zIndex: 9999,
    boxSizing: 'border-box',
    overflow: 'hidden', // 滚动交给内层，外层只负责圆角/边框/定位
  };

  const item: CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: '6px 8px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 12,
    lineHeight: 1.2,
    color: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const itemDisabled: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };

  const divider: CSSProperties = {
    height: 1,
    background: 'var(--im-panel-border, rgba(15,23,42,0.10))',
    margin: '4px 6px',
  };

  return (
    <div
      ref={ref}
      style={{ ...panel, overscrollBehavior: 'contain' }}
      data-im-ui
    >
      {/* 内层滚动容器：滚动过程中保持左右“固定留白” */}
      <div
        className="im-scrollbar"
        style={{
          maxHeight: innerMaxHeight,
          overflowX: 'hidden',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
        onWheelCapture={(e) => {
          // menu 面板内部需要滚动；阻止 wheel 冒泡到 InfiniteMap 容器，避免触发画布缩放/平移
          e.stopPropagation();
        }}
      >
        {items.map((it, i) => {
          if (it.type === 'divider') return <div key={`d-${i}`} style={divider} />;
          const enabled = it.enabled ? it.enabled(ctx, payload) : true;
          const key = `${it.id}-${i}`;
          const hovered = hoverKey === key;
          return (
            <button
              key={it.id}
              type="button"
              style={{
                ...item,
                ...(hovered && enabled
                  ? {
                      background: 'var(--im-toolbar-btn-bg, rgba(255,255,255,0.75))',
                      // 用 inset box-shadow 代替 outline：
                      // - outline 会绘制在元素外侧，容易被父容器 overflow 裁切（菜单面板为圆角需要 overflow:hidden）
                      // - inset 阴影绘制在内部，不会被裁切且视觉一致
                      boxShadow: '0 0 0 1px var(--im-toolbar-btn-border, rgba(15,23,42,0.12)) inset',
                    }
                  : null),
                ...(enabled ? null : itemDisabled),
              }}
              disabled={!enabled}
              onPointerEnter={() => setHoverKey(key)}
              onPointerLeave={() => setHoverKey((prev) => (prev === key ? null : prev))}
              onClick={() => {
                if (!enabled) return;
                run(ctx, it.id);
                ctx.store.set(STORE_KEYS.contextMenuState, null);
              }}
            >
              <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {it.icon ?? null}
              </span>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
              {it.shortcut ? (
                <span
                  style={{
                    marginLeft: 12,
                    fontSize: 12,
                    opacity: 0.7,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {it.shortcut}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});

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
    input: base.input, // 复用右键事件处理（写入 store）
    overlay: ({ ctx }) => <MenuOverlay ctx={ctx} opts={opts} />,
  };
}
