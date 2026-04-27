import { STORE_KEYS, rectIntersects, type Gesture, type HitTestTarget, type InfiniteMapPlugin, type MapContext, type MapPointerEvent, type NodeData, type Rect } from '@qiuyulc/infinite-map';
import { MarqueeOverlay } from './MarqueeOverlay';
import { isHiddenEffective, isLockedEffective } from '../editor/groupUtils';

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

type MarqueeState = {
  active: boolean;
  pointerId: number;
  startScreen: { x: number; y: number };
  currScreen: { x: number; y: number };
  startWorld: { x: number; y: number };
  currWorld: { x: number; y: number };
  shift: boolean;
};

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
      .filter((n) => !isHiddenEffective(ctx.getNodes(), n.id) && !isLockedEffective(ctx.getNodes(), n.id))
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

  const gesture: Gesture = {
    id: 'marquee',
    // 尽量最后启动（避免与 drag/resize/rotate 抢占）
    priority: -1000,
    canStart: (e: MapPointerEvent, ctx: MapContext, hit: HitTestTarget) => {
      if (ctx.store.get<boolean>(STORE_KEYS.editEnabled) === false) return false;
      if (e.button !== 0) return false;
      if (ctx.store.get<boolean>(SPACE_KEY)) return false;
      if (requireShift && !e.modifiers.shift) return false;
      return hit.kind === 'blank';
    },
    onStart: (e, ctx) => {
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
    },
    onMove: (e, ctx) => {
      const st = ctx.store.get<MarqueeState>(storeKey);
      if (!st?.active || st.pointerId !== e.pointerId) return;
      st.currScreen = { ...e.screen };
      st.currWorld = { ...e.world };
      ctx.store.set(storeKey, st);
      ctx.requestRender();
    },
    onEnd: (e, ctx) => {
      const st = ctx.store.get<MarqueeState>(storeKey);
      if (!st?.active || st.pointerId !== e.pointerId) return;

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
    },
    onCancel: (e, ctx) => {
      const st = ctx.store.get<MarqueeState>(storeKey);
      if (!st?.active || st.pointerId !== e.pointerId) return;
      clear(ctx);
    },
  };

  return {
    id: 'marquee-select',
    overlay: MarqueeOverlay,
    gestures: [gesture],
  };
}
