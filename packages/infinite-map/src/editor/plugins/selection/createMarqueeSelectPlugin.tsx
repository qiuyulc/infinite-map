import type { InfiniteMapPlugin, MapContext, MapPointerEvent } from '../../types';
import type { NodeData, Rect } from '../../../core/types';
import { rectIntersects } from '../../../core/types';
import { MarqueeOverlay } from './MarqueeOverlay';
import { STORE_KEYS } from '../../keys';

export type MarqueeSelectPluginOptions = {
  storeKey?: string;
  selectionKey?: string;
  /**
   * 是否必须按住 Shift 才能框选（避免和“空白拖动画布平移”冲突）
   */
  requireShift?: boolean;
  /**
   * 形成框选所需的最小拖动距离（像素）
   */
  minDragPx?: number;
};

const DEFAULT_STORE_KEY = STORE_KEYS.marqueeState;
const DEFAULT_SELECTION_KEY = STORE_KEYS.selectionIds;
const SPACE_KEY = STORE_KEYS.keyboardSpace;
const RESIZE_HIT_RADIUS_PX = 12;

type MarqueeState = {
  active: boolean;
  pointerId: number;
  startScreen: { x: number; y: number };
  currScreen: { x: number; y: number };
  startWorld: { x: number; y: number };
  currWorld: { x: number; y: number };
  shift: boolean;
};

function isResizeHandleEvent(e: MapPointerEvent): boolean {
  const oe = e.originalEvent as unknown as { target?: unknown } | null;
  const target = (oe?.target ?? null) as HTMLElement | null;
  if (!target) return false;
  // 选中框的缩放点会带 data-handle；命中时不应触发框选
  return Boolean(target.closest?.('[data-handle],[data-rotate-handle]'));
}

function isNearResizeHandle(ctx: MapContext, e: MapPointerEvent): boolean {
  // 仅当单选时需要做这层保护（避免快速拖动时 marquee 抢占）
  const ids = ctx.store.get<string[]>(STORE_KEYS.selectionIds) ?? [];
  if (ids.length !== 1) return false;
  const node = ctx.getNodes().find((n) => n.id === ids[0]);
  if (!node) return false;
  const p0 = ctx.worldToScreen({ x: node.x, y: node.y });
  const p1 = ctx.worldToScreen({ x: node.x + node.width, y: node.y + node.height });
  const left = Math.min(p0.x, p1.x);
  const top = Math.min(p0.y, p1.y);
  const right = Math.max(p0.x, p1.x);
  const bottom = Math.max(p0.y, p1.y);
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  const pts = [
    { x: left, y: top },
    { x: cx, y: top },
    { x: right, y: top },
    { x: right, y: cy },
    { x: right, y: bottom },
    { x: cx, y: bottom },
    { x: left, y: bottom },
    { x: left, y: cy },
  ];
  const r2 = RESIZE_HIT_RADIUS_PX * RESIZE_HIT_RADIUS_PX;
  for (const p of pts) {
    const dx = e.screen.x - p.x;
    const dy = e.screen.y - p.y;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

function hitTest(nodes: NodeData[], p: { x: number; y: number }): NodeData | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height) return n;
  }
  return null;
}

function rectFromTwoPoints(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  return { x: x0, y: y0, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

export function createMarqueeSelectPlugin(opts: MarqueeSelectPluginOptions = {}): InfiniteMapPlugin {
  const storeKey = opts.storeKey ?? DEFAULT_STORE_KEY;
  const selectionKey = opts.selectionKey ?? DEFAULT_SELECTION_KEY;
  const requireShift = opts.requireShift ?? false;
  const minDragPx = opts.minDragPx ?? 3;

  const clear = (ctx: MapContext) => {
    ctx.store.set(storeKey, null);
    ctx.requestRender();
  };

  const commitSelection = (ctx: MapContext, rectWorld: Rect, shift: boolean) => {
    // 先用空间索引取候选，再做精确相交过滤
    const candidates = ctx.queryNodesInWorldRect(rectWorld) as NodeData[];
    const hitIds = candidates
      .filter((n) => rectIntersects(rectWorld, { x: n.x, y: n.y, w: n.width, h: n.height }))
      .map((n) => n.id);

    if (shift) {
      const prev = ctx.store.get<string[]>(selectionKey) ?? [];
      const set = new Set(prev);
      hitIds.forEach((id) => set.add(id));
      const next = [...set];
      ctx.store.set(selectionKey, next);
      ctx.bus.emit('selection:change', { ids: next });
    } else {
      ctx.store.set(selectionKey, hitIds);
      ctx.bus.emit('selection:change', { ids: hitIds });
    }
    ctx.requestRender();
  };

  const clearSelection = (ctx: MapContext) => {
    ctx.store.set(selectionKey, []);
    ctx.bus.emit('selection:change', { ids: [] });
    ctx.requestRender();
  };

  return {
    id: 'marquee-select',
    overlay: MarqueeOverlay,
    handlers: {
      onPointerDown: (e: MapPointerEvent, ctx) => {
        if (e.button !== 0) return { handled: false };
        // Space：平移模式，不启用框选
        if (ctx.store.get<boolean>(SPACE_KEY)) return { handled: false };
        // resize handle：不启用框选（让 resize 插件接管）
        if (isResizeHandleEvent(e) || isNearResizeHandle(ctx, e)) return { handled: false };
        if (requireShift && !e.modifiers.shift) return { handled: false };

        // 命中节点则不启用框选（让 selection/drag 处理）
        const hit = hitTest(ctx.getVisibleNodes(), e.world);
        if (hit) return { handled: false };

        const st: MarqueeState = {
          active: true,
          pointerId: e.pointerId,
          startScreen: { ...e.screen },
          currScreen: { ...e.screen },
          startWorld: { ...e.world },
          currWorld: { ...e.world },
          shift: e.modifiers.shift,
        };
        ctx.store.set(storeKey, st);
        ctx.requestRender();
        // stop：阻止画布平移（鼠标拖框选）
        return { handled: true };
      },
      onPointerMove: (e: MapPointerEvent, ctx) => {
        const st = ctx.store.get<MarqueeState>(storeKey);
        if (!st?.active || st.pointerId !== e.pointerId) return { handled: false };

        st.currScreen = { ...e.screen };
        st.currWorld = { ...e.world };
        ctx.store.set(storeKey, st);
        ctx.requestRender();
        return { handled: true };
      },
      onPointerUp: (e: MapPointerEvent, ctx) => {
        const st = ctx.store.get<MarqueeState>(storeKey);
        if (!st?.active || st.pointerId !== e.pointerId) return { handled: false };

        const dx = st.currScreen.x - st.startScreen.x;
        const dy = st.currScreen.y - st.startScreen.y;
        if (Math.hypot(dx, dy) >= minDragPx) {
          const rectWorld = rectFromTwoPoints(st.startWorld, st.currWorld);
          commitSelection(ctx, rectWorld, st.shift);
        } else {
          // 空白处“点击”：
          // - 非 Shift：清空选择（符合常见编辑器预期）
          // - Shift：不改变选择
          if (!st.shift) clearSelection(ctx);
        }

        clear(ctx);
        return { handled: true };
      },
      onPointerCancel: (e: MapPointerEvent, ctx) => {
        const st = ctx.store.get<MarqueeState>(storeKey);
        if (!st?.active || st.pointerId !== e.pointerId) return { handled: false };
        clear(ctx);
        return { handled: true };
      },
    },
  };
}

