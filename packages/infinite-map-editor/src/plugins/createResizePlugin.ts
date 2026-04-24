import {
  STORE_KEYS,
  computeAdaptiveSteps,
  type InfiniteMapPlugin,
  type MapContext,
  type MapPointerEvent,
  type NodeData,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import { getViewportCenterWorld, setSnapGuides, snapToGrid, type SnapConfig } from '../editor/snapUtils';
import { DEFAULT_GROUP_PADDING, isHiddenEffective, isLockedEffective } from '../editor/groupUtils';

export type ResizePluginOptions = {
  selectionKey?: string;
  spaceKey?: string;
  /**
   * 指示点命中半径（像素）
   */
  hitRadiusPx?: number;
  /**
   * 最小宽高（世界坐标）
   */
  minSize?: number;
};

type Handle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

type ResizeState = {
  pointerId: number;
  id: string;
  handle: Handle;
  startPointerWorld: { x: number; y: number };
  startRect: { x: number; y: number; w: number; h: number };
  lastRect: { x: number; y: number; w: number; h: number };
  /**
   * 若当前 resize 的是 group，则需要同步缩放其后代节点
   */
  groupMembers?: Array<{ id: string; x: number; y: number; w: number; h: number }>;
};

const DEFAULT_SELECTION_KEY = STORE_KEYS.selectionIds;
const DEFAULT_SPACE_KEY = STORE_KEYS.keyboardSpace;
const STORE_KEY = STORE_KEYS.resizeState;

function clampMin(v: number, min: number) {
  return v < min ? min : v;
}

function findNode(nodes: NodeData[], id: string) {
  return nodes.find((n) => n.id === id) ?? null;
}

function hitHandle(ctx: MapContext, node: NodeData, screen: { x: number; y: number }, radiusPx: number): Handle | null {
  const p0 = ctx.worldToScreen({ x: node.x, y: node.y });
  const p1 = ctx.worldToScreen({ x: node.x + node.width, y: node.y + node.height });
  const left = Math.min(p0.x, p1.x);
  const top = Math.min(p0.y, p1.y);
  const right = Math.max(p0.x, p1.x);
  const bottom = Math.max(p0.y, p1.y);
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  const pts: Array<{ h: Handle; x: number; y: number }> = [
    { h: 'nw', x: left, y: top },
    { h: 'n', x: cx, y: top },
    { h: 'ne', x: right, y: top },
    { h: 'e', x: right, y: cy },
    { h: 'se', x: right, y: bottom },
    { h: 's', x: cx, y: bottom },
    { h: 'sw', x: left, y: bottom },
    { h: 'w', x: left, y: cy },
  ];

  const r2 = radiusPx * radiusPx;
  let best: { h: Handle; d2: number } | null = null;
  for (const p of pts) {
    const dx = screen.x - p.x;
    const dy = screen.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= r2 && (!best || d2 < best.d2)) best = { h: p.h, d2 };
  }
  return best?.h ?? null;
}

function handleFromEvent(e: MapPointerEvent): Handle | null {
  const oe = e.originalEvent as unknown as { target?: unknown } | null;
  const target = (oe?.target ?? null) as HTMLElement | null;
  const raw = target?.dataset?.handle;
  if (!raw) return null;
  if (raw === 'n' || raw === 's' || raw === 'e' || raw === 'w' || raw === 'nw' || raw === 'ne' || raw === 'sw' || raw === 'se')
    return raw;
  return null;
}

function computeRect(start: { x: number; y: number; w: number; h: number }, handle: Handle, dx: number, dy: number, minSize: number) {
  let x = start.x;
  let y = start.y;
  let w = start.w;
  let h = start.h;

  const applyW = () => {
    const nextW = clampMin(w - dx, minSize);
    // 宽度减小时，x 需要前移；如果被 clamp，则 x 也要按实际变化调整
    x += w - nextW;
    w = nextW;
  };
  const applyE = () => {
    w = clampMin(w + dx, minSize);
  };
  const applyN = () => {
    const nextH = clampMin(h - dy, minSize);
    y += h - nextH;
    h = nextH;
  };
  const applyS = () => {
    h = clampMin(h + dy, minSize);
  };

  if (handle.includes('w')) applyW();
  if (handle.includes('e')) applyE();
  if (handle.includes('n')) applyN();
  if (handle.includes('s')) applyS();

  return { x, y, w, h };
}

export function createResizePlugin(opts: ResizePluginOptions = {}): InfiniteMapPlugin {
  const selectionKey = opts.selectionKey ?? DEFAULT_SELECTION_KEY;
  const spaceKey = opts.spaceKey ?? DEFAULT_SPACE_KEY;
  const hitRadiusPx = opts.hitRadiusPx ?? 10;
  const minSize = opts.minSize ?? 40;

  const start = (e: MapPointerEvent, ctx: MapContext) => {
    const ids = ctx.store.get<string[]>(selectionKey) ?? [];
    if (ids.length !== 1) return null;

    const node = findNode(ctx.getNodes(), ids[0]);
    if (!node) return null;
    if (isHiddenEffective(ctx.getNodes(), node.id) || isLockedEffective(ctx.getNodes(), node.id)) return null;

    // 优先从 DOM 指示点读取（可 hover/可点击）；否则回退到几何命中
    const handle = handleFromEvent(e) ?? hitHandle(ctx, node, e.screen, hitRadiusPx);
    if (!handle) return null;

    const st: ResizeState = {
      pointerId: e.pointerId,
      id: node.id,
      handle,
      startPointerWorld: { ...e.world },
      startRect: { x: node.x, y: node.y, w: node.width, h: node.height },
      lastRect: { x: node.x, y: node.y, w: node.width, h: node.height },
    };

    // group：记录后代节点起始数据，用于“整体缩放”
    if (node.kind === 'group') {
      const groupSvc = ctx.getService<{ expandIds: (ids: string[]) => string[] }>('group');
      const expanded = groupSvc?.expandIds ? groupSvc.expandIds([node.id]) : [node.id];
      const memberIds = expanded.filter((id) => id !== node.id);
      const byId = new Map(ctx.getNodes().map((n) => [n.id, n] as const));
      st.groupMembers = memberIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((n) => ({ id: n!.id, x: n!.x, y: n!.y, w: n!.width, h: n!.height }));
    }

    ctx.store.set(STORE_KEY, st);
    ctx.requestRender();
    return st;
  };

  const move = (e: MapPointerEvent, ctx: MapContext) => {
    const st = ctx.store.get<ResizeState>(STORE_KEY);
    if (!st || st.pointerId !== e.pointerId) return false;
    const dx = e.world.x - st.startPointerWorld.x;
    const dy = e.world.y - st.startPointerWorld.y;

    let next = computeRect(st.startRect, st.handle, dx, dy, minSize);

    const cfg = ctx.store.get<SnapConfig>(STORE_KEYS.snapConfig);
    if (cfg?.enabled) {
      const zoom = ctx.getCamera().zoom || 1;
      const thresholdWorld = (cfg.thresholdPx ?? 6) / zoom;
      const gridSize =
        cfg.gridSize === 'auto'
          ? computeAdaptiveSteps(zoom, { majorTargetPx: cfg.gridTargetPx ?? 84 }).minorStepWorld
          : (cfg.gridSize ?? 48);

      const left = next.x;
      const right = next.x + next.w;
      const top = next.y;
      const bottom = next.y + next.h;

      // 只用“可视范围内”节点做对齐参照（更符合编辑器直觉）
      const others = ctx.getVisibleNodes().filter((n) => n.id !== st.id);
      let snapDx = 0;
      let snapDy = 0;
      let guideV: number | null = null;
      let guideH: number | null = null;

      const wantLeft = st.handle.includes('w');
      const wantRight = st.handle.includes('e');
      const wantTop = st.handle.includes('n');
      const wantBottom = st.handle.includes('s');

      const tryX = (target: number, source: number) => {
        const d = target - source;
        const ad = Math.abs(d);
        if (ad <= thresholdWorld && (guideV == null || ad < Math.abs(snapDx))) {
          snapDx = d;
          guideV = target;
        }
      };
      const tryY = (target: number, source: number) => {
        const d = target - source;
        const ad = Math.abs(d);
        if (ad <= thresholdWorld && (guideH == null || ad < Math.abs(snapDy))) {
          snapDy = d;
          guideH = target;
        }
      };

      for (const o of others) {
        const ox = [o.x, o.x + o.width / 2, o.x + o.width];
        const oy = [o.y, o.y + o.height / 2, o.y + o.height];
        if (wantLeft) for (const tx of ox) tryX(tx, left);
        if (wantRight) for (const tx of ox) tryX(tx, right);
        if (wantTop) for (const ty of oy) tryY(ty, top);
        if (wantBottom) for (const ty of oy) tryY(ty, bottom);
      }

      // 若“严格 in view（minimap 统计）”只有 1 个节点：允许吸附到“视口中心线”
      const inViewCount = ctx.store.get<number>(STORE_KEYS.minimapInViewCount) ?? 0;
      if (inViewCount === 1) {
        const c = getViewportCenterWorld(ctx);
        const centerWorldX = c.x;
        const centerWorldY = c.y;
        if (wantLeft) tryX(centerWorldX, left);
        if (wantRight) tryX(centerWorldX, right);
        if (wantTop) tryY(centerWorldY, top);
        if (wantBottom) tryY(centerWorldY, bottom);
      }

      // 网格吸附（仅当没有对齐线命中时）
      if (guideV == null) {
        if (wantLeft) {
          const d = snapToGrid(left, gridSize) - left;
          if (Math.abs(d) <= thresholdWorld) snapDx = d;
        } else if (wantRight) {
          const d = snapToGrid(right, gridSize) - right;
          if (Math.abs(d) <= thresholdWorld) snapDx = d;
        }
      }
      if (guideH == null) {
        if (wantTop) {
          const d = snapToGrid(top, gridSize) - top;
          if (Math.abs(d) <= thresholdWorld) snapDy = d;
        } else if (wantBottom) {
          const d = snapToGrid(bottom, gridSize) - bottom;
          if (Math.abs(d) <= thresholdWorld) snapDy = d;
        }
      }

      if (snapDx !== 0) {
        if (wantLeft) {
          next = { ...next, x: next.x + snapDx, w: next.w - snapDx };
        } else if (wantRight) {
          next = { ...next, w: next.w + snapDx };
        }
        next = { ...next, w: clampMin(next.w, minSize) };
      }
      if (snapDy !== 0) {
        if (wantTop) {
          next = { ...next, y: next.y + snapDy, h: next.h - snapDy };
        } else if (wantBottom) {
          next = { ...next, h: next.h + snapDy };
        }
        next = { ...next, h: clampMin(next.h, minSize) };
      }

      const vLines: number[] = [];
      const hLines: number[] = [];
      if (guideV != null) vLines.push(ctx.worldToScreen({ x: guideV, y: 0 }).x);
      if (guideH != null) hLines.push(ctx.worldToScreen({ x: 0, y: guideH }).y);
      setSnapGuides(ctx, vLines.length || hLines.length ? { v: vLines, h: hLines } : null, STORE_KEYS.snapGuides);
    } else {
      setSnapGuides(ctx, null, STORE_KEYS.snapGuides);
    }

    st.lastRect = next;
    ctx.store.set(STORE_KEY, st);

    const patches: NodePatch[] = [{ type: 'set', id: st.id, data: { x: next.x, y: next.y, width: next.w, height: next.h } }];

    // group：对子节点做缩放映射（以 group 的 startRect 为基准）
    if (st.groupMembers && st.groupMembers.length) {
      // 以 group 的“内容区域（去掉 padding）”为基准缩放，保持 padding 恒定
      const p = DEFAULT_GROUP_PADDING;
      const startInner = { x: st.startRect.x + p, y: st.startRect.y + p, w: Math.max(1, st.startRect.w - 2 * p), h: Math.max(1, st.startRect.h - 2 * p) };
      const nextInner = { x: next.x + p, y: next.y + p, w: Math.max(1, next.w - 2 * p), h: Math.max(1, next.h - 2 * p) };
      const sx = startInner.w ? nextInner.w / startInner.w : 1;
      const sy = startInner.h ? nextInner.h / startInner.h : 1;
      for (const m of st.groupMembers) {
        const rx = (m.x - startInner.x) * sx;
        const ry = (m.y - startInner.y) * sy;
        patches.push({
          type: 'set',
          id: m.id,
          data: { x: nextInner.x + rx, y: nextInner.y + ry, width: m.w * sx, height: m.h * sy },
        });
      }
    }
    ctx.applyPatches(patches, { source: 'plugin', plugin: 'resize', reason: 'drag', phase: 'move', ids: [st.id] });
    ctx.requestRender();
    return true;
  };

  const end = (e: MapPointerEvent, ctx: MapContext) => {
    const st = ctx.store.get<ResizeState>(STORE_KEY);
    if (!st || st.pointerId !== e.pointerId) return false;
    const last = st.lastRect;
    const patches: NodePatch[] = [{ type: 'set', id: st.id, data: { x: last.x, y: last.y, width: last.w, height: last.h } }];
    if (st.groupMembers && st.groupMembers.length) {
      const p = DEFAULT_GROUP_PADDING;
      const startInner = { x: st.startRect.x + p, y: st.startRect.y + p, w: Math.max(1, st.startRect.w - 2 * p), h: Math.max(1, st.startRect.h - 2 * p) };
      const lastInner = { x: last.x + p, y: last.y + p, w: Math.max(1, last.w - 2 * p), h: Math.max(1, last.h - 2 * p) };
      const sx = startInner.w ? lastInner.w / startInner.w : 1;
      const sy = startInner.h ? lastInner.h / startInner.h : 1;
      for (const m of st.groupMembers) {
        const rx = (m.x - startInner.x) * sx;
        const ry = (m.y - startInner.y) * sy;
        patches.push({
          type: 'set',
          id: m.id,
          data: { x: lastInner.x + rx, y: lastInner.y + ry, width: m.w * sx, height: m.h * sy },
        });
      }
    }
    ctx.applyPatches(patches, { source: 'plugin', plugin: 'resize', reason: 'drag', phase: 'end', ids: [st.id] });
    ctx.store.set(STORE_KEY, null);
    setSnapGuides(ctx, null, STORE_KEYS.snapGuides);
    ctx.requestRender();
    return true;
  };

  return {
    id: 'resize',
    overlayPointerEvents: 'auto',
    handlers: {
      onPointerDown: (e, ctx) => {
        if (e.button !== 0) return { handled: false };
        if (ctx.store.get<boolean>(spaceKey)) return { handled: false };
        const st = start(e, ctx);
        if (!st) return { handled: false };
        // stop：避免被 drag/pan 接管
        return { handled: true };
      },
      onPointerMove: (e, ctx) => {
        const st = ctx.store.get<ResizeState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        move(e, ctx);
        return { handled: true };
      },
      onPointerUp: (e, ctx) => {
        const st = ctx.store.get<ResizeState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        end(e, ctx);
        return { handled: true };
      },
      onPointerCancel: (e, ctx) => {
        const st = ctx.store.get<ResizeState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        end(e, ctx);
        return { handled: true };
      },
    },
  };
}
