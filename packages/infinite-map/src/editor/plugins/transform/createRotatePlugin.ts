import type { InfiniteMapPlugin, MapContext, MapPointerEvent, NodePatch } from '../../types';
import { STORE_KEYS } from '../../keys';

type RotateState = {
  pointerId: number;
  cx: number;
  cy: number;
  startAngleRad: number;
  ids: string[];
  startById: Record<string, { x: number; y: number; rotation: number; w: number; h: number }>;
};

const STORE_KEY = STORE_KEYS.rotateState;
const SELECTION_KEY = STORE_KEYS.selectionIds;
const SPACE_KEY = STORE_KEYS.keyboardSpace;

function normalizeDeg(d: number) {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

function handleFromEvent(e: MapPointerEvent): boolean {
  const oe = e.originalEvent as unknown as { target?: unknown } | null;
  const target = (oe?.target ?? null) as HTMLElement | null;
  if (!target) return false;
  return Boolean(target.closest?.('[data-rotate-handle]'));
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * 旋转 handle 几何命中兜底：
 * - 避免某些场景下 DOM target/overlay pointer-events 导致 handleFromEvent 失效
 */
function hitRotateHandle(e: MapPointerEvent, ctx: MapContext): boolean {
  const ids = ctx.store.get<string[]>(SELECTION_KEY) ?? [];
  if (ids.length === 0) return false;

  const r2 = 14 * 14;

  // 单选：handle 跟随节点旋转（基于世界坐标推导 handle 位置）
  if (ids.length === 1) {
    const n = ctx.getNodes().find((x) => x.id === ids[0]);
    if (!n) return false;
    const zoom = ctx.getCamera().zoom || 1;
    const offsetWorld = 22 / zoom; // 与 SelectionOverlay 的 -22px 对齐

    const center = { x: n.x + n.width / 2, y: n.y + n.height / 2 };
    const deg = (n.rotation ?? 0) * (Math.PI / 180);
    const cos = Math.cos(deg);
    const sin = Math.sin(deg);

    // 从中心指向顶部中点再向上偏移 offsetWorld
    const vx = 0;
    const vy = -(n.height / 2 + offsetWorld);
    const rx = vx * cos - vy * sin;
    const ry = vx * sin + vy * cos;
    const hpWorld = { x: center.x + rx, y: center.y + ry };
    const hpScreen = ctx.worldToScreen(hpWorld);
    return dist2(e.screen, hpScreen) <= r2;
  }

  // 多选：handle 在包围盒顶部中点上方（屏幕坐标）
  const nodes = ctx.getNodes().filter((n) => ids.includes(n.id));
  if (nodes.length === 0) return false;
  const pts = nodes.flatMap((n) => {
    const p0 = ctx.worldToScreen({ x: n.x, y: n.y });
    const p1 = ctx.worldToScreen({ x: n.x + n.width, y: n.y + n.height });
    const left = Math.min(p0.x, p1.x);
    const top = Math.min(p0.y, p1.y);
    const right = Math.max(p0.x, p1.x);
    const bottom = Math.max(p0.y, p1.y);
    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: bottom },
      { x: right, y: bottom },
    ];
  });
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const hp = { x: (minX + maxX) / 2, y: minY - 18 };
  return dist2(e.screen, hp) <= r2;
}

export function createRotatePlugin(): InfiniteMapPlugin {
  const start = (e: MapPointerEvent, ctx: MapContext): RotateState | null => {
    let ids = ctx.store.get<string[]>(SELECTION_KEY) ?? [];
    if (ids.length < 1) return null;

    // group：若选中包含 group，则旋转时带上其后代（整组旋转）
    const groupSvc = ctx.getService<{ expandIds: (ids: string[]) => string[] }>('group');
    if (groupSvc?.expandIds) ids = groupSvc.expandIds(ids);

    // 重要：group 节点是“结构外框”，不参与旋转（只旋转其成员）
    // 否则会与 group-sync（自动 bbox）产生“拉扯”，导致看起来像旋转失效/抖动。
    const byId = new Map(ctx.getNodes().map((n) => [n.id, n] as const));
    ids = ids.filter((id) => byId.get(id)?.kind !== 'group');
    if (ids.length === 0) return null;

    const nodes = ctx.getNodes().filter((n) => ids.includes(n.id));
    if (nodes.length === 0) return null;

    // 组旋转中心：使用选中集合的轴对齐包围盒中心（世界坐标）
    const minX = Math.min(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const maxY = Math.max(...nodes.map((n) => n.y + n.height));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const startAngleRad = Math.atan2(e.world.y - cy, e.world.x - cx);
    const startById: RotateState['startById'] = {};
    for (const n of nodes) {
      startById[n.id] = { x: n.x, y: n.y, rotation: n.rotation ?? 0, w: n.width, h: n.height };
    }

    const st: RotateState = { pointerId: e.pointerId, cx, cy, startAngleRad, ids, startById };
    ctx.store.set(STORE_KEY, st);
    ctx.requestRender();
    return st;
  };

  const move = (e: MapPointerEvent, ctx: MapContext): boolean => {
    const st = ctx.store.get<RotateState>(STORE_KEY);
    if (!st || st.pointerId !== e.pointerId) return false;
    const a = Math.atan2(e.world.y - st.cy, e.world.x - st.cx);
    const delta = a - st.startAngleRad;
    const deltaDeg = (delta * 180) / Math.PI;

    const cos = Math.cos(delta);
    const sin = Math.sin(delta);

    const patches: NodePatch[] = [];
    for (const id of st.ids) {
      const start = st.startById[id];
      if (!start) continue;

      // 以节点中心绕组中心旋转，更新 x/y
      const px = start.x + start.w / 2;
      const py = start.y + start.h / 2;
      const dx = px - st.cx;
      const dy = py - st.cy;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      const nextCx = st.cx + rx;
      const nextCy = st.cy + ry;
      const nextX = nextCx - start.w / 2;
      const nextY = nextCy - start.h / 2;

      const nextRot = normalizeDeg(start.rotation + deltaDeg);
      patches.push({ type: 'set', id, data: { x: nextX, y: nextY, rotation: nextRot } });
    }

    ctx.applyPatches(patches, { source: 'plugin', plugin: 'rotate', reason: 'drag', phase: 'move', ids: st.ids });
    ctx.requestRender();
    return true;
  };

  const end = (e: MapPointerEvent, ctx: MapContext): boolean => {
    const st = ctx.store.get<RotateState>(STORE_KEY);
    if (!st || st.pointerId !== e.pointerId) return false;
    // 结束时再提交一次（确保最终值）
    move(e, ctx);
    ctx.store.set(STORE_KEY, null);
    ctx.requestRender();
    return true;
  };

  return {
    id: 'rotate',
    handlers: {
      onPointerDown: (e, ctx) => {
        if (e.button !== 0) return { handled: false };
        if (ctx.store.get<boolean>(SPACE_KEY)) return { handled: false };
        // 优先走 DOM 命中，其次走几何命中兜底
        if (!handleFromEvent(e) && !hitRotateHandle(e, ctx)) return { handled: false };
        const st = start(e, ctx);
        if (!st) return { handled: false };
        return { handled: true };
      },
      onPointerMove: (e, ctx) => {
        const st = ctx.store.get<RotateState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        move(e, ctx);
        return { handled: true };
      },
      onPointerUp: (e, ctx) => {
        const st = ctx.store.get<RotateState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        end(e, ctx);
        return { handled: true };
      },
      onPointerCancel: (e, ctx) => {
        const st = ctx.store.get<RotateState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        end(e, ctx);
        return { handled: true };
      },
    },
  };
}
