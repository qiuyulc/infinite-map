import {
  STORE_KEYS,
  computeAdaptiveSteps,
  type Gesture,
  type HitTestTarget,
  type InfiniteMapPlugin,
  type MapContext,
  type MapPointerEvent,
  type NodePatch,
} from '@qiuyulc/infinite-map';
import { bboxOf, getViewportCenterWorld, setSnapGuides, snapToGrid, type SnapConfig } from '../editor/snapUtils';
import { isHiddenEffective, isLockedEffective } from '../editor/groupUtils';
 
export type DragPluginOptions = {
  /**
   * store key（方便未来多 scope）
   */
  dragKey?: string;
  /**
   * 拖拽命中节点时，是否自动把 selection 设置为该节点（单选）
   */
  selectOnDrag?: boolean;
  /**
   * selection store key（当 selectOnDrag=true 时使用）
   */
  selectionKey?: string;
};
 
type DragState = {
  pointerId: number;
  /**
   * 主命中节点（用于事件/调试）
   */
  primaryId: string;
  /**
   * 本次拖拽要移动的节点集合（单选 or 多选）
   */
  ids: string[];
  startPointerWorld: { x: number; y: number };
  startById: Record<string, { x: number; y: number }>;
  lastById: Record<string, { x: number; y: number }>;
};
 
const DEFAULT_DRAG_KEY = STORE_KEYS.dragState;
const DEFAULT_SELECTION_KEY = STORE_KEYS.selectionIds;
const SPACE_KEY = STORE_KEYS.keyboardSpace;
 
export function createDragPlugin(opts: DragPluginOptions = {}): InfiniteMapPlugin {
  const dragKey = opts.dragKey ?? DEFAULT_DRAG_KEY;
  const selectOnDrag = opts.selectOnDrag ?? true;
  const selectionKey = opts.selectionKey ?? DEFAULT_SELECTION_KEY;
 
  const startDrag = (e: MapPointerEvent, ctx: MapContext, hitId: string) => {
    if (ctx.store.get<boolean>(STORE_KEYS.editEnabled) === false) return null;
    const hit = ctx.getNodes().find((n) => n.id === hitId) ?? null;
    if (!hit) return null;
    if (isHiddenEffective(ctx.getNodes(), hit.id) || isLockedEffective(ctx.getNodes(), hit.id)) return null;
 
    const selected = ctx.store.get<string[]>(selectionKey) ?? [];
    const selectedSet = new Set(selected);
    // 命中节点的 group 语义应由 selectionProcessor 统一写回 “有效 hit”
    // - 这里直接使用 hit.id 作为 primaryId
    const effectiveHitId = hit.id;
    const hitInSelection = selectedSet.has(hit.id);
 
    // 规则：
    // - 拖拽已选中节点：如果 selection 有多个，则整体拖动；否则单节点拖动
    // - 拖拽未选中节点：自动单选它（可配置），只拖动它
    let dragIds: string[] = [];
    if (hitInSelection && selected.length > 1) {
      dragIds = selected;
    } else {
      dragIds = [effectiveHitId];
      if (selectOnDrag && !hitInSelection) {
        ctx.store.set(selectionKey, [effectiveHitId]);
        ctx.bus.emit('selection:change', { ids: [effectiveHitId] });
        ctx.requestRender();
      }
    }
 
    // group：展开 dragIds（把 group 的后代加入移动集合）
    const groupSvc = ctx.getService<{ expandIds: (ids: string[]) => string[] }>('group');
    if (groupSvc?.expandIds) dragIds = groupSvc.expandIds(dragIds);
    // locked/hidden：剔除不可编辑的节点（组锁定传递）
    dragIds = dragIds.filter((id) => !isHiddenEffective(ctx.getNodes(), id) && !isLockedEffective(ctx.getNodes(), id));
    if (dragIds.length === 0) return null;

    const nodes = ctx.getNodes();
    const startById: Record<string, { x: number; y: number }> = {};
    const lastById: Record<string, { x: number; y: number }> = {};
    for (const id of dragIds) {
      const n = nodes.find((x) => x.id === id);
      if (!n) continue;
      startById[id] = { x: n.x, y: n.y };
      lastById[id] = { x: n.x, y: n.y };
    }
 
    const st: DragState = {
      pointerId: e.pointerId,
      primaryId: effectiveHitId,
      ids: dragIds,
      startPointerWorld: { ...e.world },
      startById,
      lastById,
    };
    ctx.store.set(dragKey, st);
    ctx.bus.emit('drag:start', { id: effectiveHitId, startWorld: { ...e.world } });
    ctx.requestRender();
    return st;
  };
 
  const updateDrag = (e: MapPointerEvent, ctx: MapContext) => {
    const st = ctx.store.get<DragState>(dragKey);
    if (!st || st.pointerId !== e.pointerId) return false;
 
    const dx = e.world.x - st.startPointerWorld.x;
    const dy = e.world.y - st.startPointerWorld.y;
 
    let ddx = dx;
    let ddy = dy;
 
    const cfg = ctx.store.get<SnapConfig>(STORE_KEYS.snapConfig);
    if (cfg?.enabled) {
      const zoom = ctx.getCamera().zoom || 1;
      const thresholdWorld = (cfg.thresholdPx ?? 6) / zoom;
      const gridSize =
        cfg.gridSize === 'auto'
          ? computeAdaptiveSteps(zoom, { majorTargetPx: cfg.gridTargetPx ?? 84 }).minorStepWorld
          : (cfg.gridSize ?? 48);
 
      // moving bbox（基于 startById + 当前 nodes 的宽高）
      const currentNodes = ctx.getNodes();
      const moving = st.ids
        .map((id) => {
          const s = st.startById[id];
          const n = currentNodes.find((x) => x.id === id);
          if (!s || !n) return null;
          return { x: s.x + ddx, y: s.y + ddy, width: n.width, height: n.height };
        })
        .filter(Boolean) as Array<{ x: number; y: number; width: number; height: number }>;
 
      if (moving.length > 0) {
        const bb = bboxOf(moving);
        const left = bb.x;
        const cx = bb.x + bb.w / 2;
        const right = bb.x + bb.w;
        const top = bb.y;
        const cy = bb.y + bb.h / 2;
        const bottom = bb.y + bb.h;
 
        // 对齐吸附（优先于网格）
        // 只用“可视范围内”节点做对齐参照（更符合编辑器直觉）
        const visibleOthers = ctx.getVisibleNodes().filter((n) => !st.ids.includes(n.id));
        let bestDx = 0;
        let bestDy = 0;
        let guideV: number | null = null; // world x
        let guideH: number | null = null; // world y
 
        const tryX = (target: number, source: number) => {
          const d = target - source;
          const ad = Math.abs(d);
          if (ad <= thresholdWorld && (guideV == null || ad < Math.abs(bestDx))) {
            bestDx = d;
            guideV = target;
          }
        };
        const tryY = (target: number, source: number) => {
          const d = target - source;
          const ad = Math.abs(d);
          if (ad <= thresholdWorld && (guideH == null || ad < Math.abs(bestDy))) {
            bestDy = d;
            guideH = target;
          }
        };
 
        for (const o of visibleOthers) {
          const ox = [o.x, o.x + o.width / 2, o.x + o.width];
          const oy = [o.y, o.y + o.height / 2, o.y + o.height];
          for (const tx of ox) {
            tryX(tx, left);
            tryX(tx, cx);
            tryX(tx, right);
          }
          for (const ty of oy) {
            tryY(ty, top);
            tryY(ty, cy);
            tryY(ty, bottom);
          }
        }
 
        // 若“严格 in view（minimap 统计）”只有 1 个节点：允许吸附到“视口中心线”
        const inViewCount = ctx.store.get<number>(STORE_KEYS.minimapInViewCount) ?? 0;
        if (inViewCount === 1) {
          const c = getViewportCenterWorld(ctx);
          const centerWorldX = c.x;
          const centerWorldY = c.y;
          tryX(centerWorldX, left);
          tryX(centerWorldX, cx);
          tryX(centerWorldX, right);
          tryY(centerWorldY, top);
          tryY(centerWorldY, cy);
          tryY(centerWorldY, bottom);
        }
 
        if (guideV != null) ddx += bestDx;
        if (guideH != null) ddy += bestDy;
 
        // 网格吸附（没有对齐线命中时才用）
        if (guideV == null) {
          const candidates = [snapToGrid(left, gridSize) - left, snapToGrid(cx, gridSize) - cx, snapToGrid(right, gridSize) - right];
          let best = 0;
          for (const d of candidates) if (Math.abs(d) <= thresholdWorld && (best === 0 || Math.abs(d) < Math.abs(best))) best = d;
          ddx += best;
        }
        if (guideH == null) {
          const candidates = [snapToGrid(top, gridSize) - top, snapToGrid(cy, gridSize) - cy, snapToGrid(bottom, gridSize) - bottom];
          let best = 0;
          for (const d of candidates) if (Math.abs(d) <= thresholdWorld && (best === 0 || Math.abs(d) < Math.abs(best))) best = d;
          ddy += best;
        }
 
        const vLines: number[] = [];
        const hLines: number[] = [];
        if (guideV != null) vLines.push(ctx.worldToScreen({ x: guideV, y: 0 }).x);
        if (guideH != null) hLines.push(ctx.worldToScreen({ x: 0, y: guideH }).y);
        setSnapGuides(ctx, vLines.length || hLines.length ? { v: vLines, h: hLines } : null, STORE_KEYS.snapGuides);
      }
    } else {
      setSnapGuides(ctx, null, STORE_KEYS.snapGuides);
    }
 
    const patches: NodePatch[] = [];
    for (const id of st.ids) {
      const start = st.startById[id];
      if (!start) continue;
      const nextX = start.x + ddx;
      const nextY = start.y + ddy;
      st.lastById[id] = { x: nextX, y: nextY };
      patches.push({ type: 'move', id, x: nextX, y: nextY });
    }
 
    ctx.store.set(dragKey, st);
    ctx.bus.emit('drag:move', { id: st.primaryId, rawWorld: { ...e.world } });
    ctx.applyPatches(patches, {
      source: 'plugin',
      plugin: 'drag',
      reason: 'drag',
      phase: 'move',
      ids: st.ids,
    });
 
    ctx.requestRender();
    return true;
  };
 
  const endDrag = (e: MapPointerEvent, ctx: MapContext) => {
    const st = ctx.store.get<DragState>(dragKey);
    if (!st || st.pointerId !== e.pointerId) return false;
    // 用最新一次计算的 lastById 作为最终提交（避免 up 时指针跳动）
    const patches: NodePatch[] = [];
    for (const id of st.ids) {
      const last = st.lastById[id];
      if (!last) continue;
      patches.push({ type: 'move', id, x: last.x, y: last.y });
    }
    ctx.applyPatches(patches, { source: 'plugin', plugin: 'drag', reason: 'drag', phase: 'end', ids: st.ids });
    ctx.bus.emit('drag:end', { id: st.primaryId, endWorld: { ...e.world } });
    ctx.store.set(dragKey, null);
    setSnapGuides(ctx, null, STORE_KEYS.snapGuides);
    ctx.requestRender();
    return true;
  };
 
  return {
    id: 'drag',
    gestures: [
      {
        id: 'drag',
        priority: 100,
        canStart: (e: MapPointerEvent, ctx: MapContext, hit: HitTestTarget) => {
          if (ctx.store.get<boolean>(STORE_KEYS.editEnabled) === false) return false;
          if (e.button !== 0) return false;
          if (ctx.store.get<boolean>(SPACE_KEY)) return false;
          if (hit.kind !== 'node') return false;
          if (isHiddenEffective(ctx.getNodes(), hit.id) || isLockedEffective(ctx.getNodes(), hit.id)) return false;
          const selected = ctx.store.get<string[]>(selectionKey) ?? [];
          return selected.includes(hit.id) || selectOnDrag;
        },
        onStart: (e: MapPointerEvent, ctx: MapContext, hit: HitTestTarget) => {
          if (hit.kind !== 'node') return;
          startDrag(e, ctx, hit.id);
        },
        onMove: (e: MapPointerEvent, ctx: MapContext) => {
          const st = ctx.store.get<DragState>(dragKey);
          if (!st || st.pointerId !== e.pointerId) return;
          updateDrag(e, ctx);
        },
        onEnd: (e: MapPointerEvent, ctx: MapContext) => {
          const st = ctx.store.get<DragState>(dragKey);
          if (!st || st.pointerId !== e.pointerId) return;
          endDrag(e, ctx);
        },
        onCancel: (e: MapPointerEvent, ctx: MapContext) => {
          const st = ctx.store.get<DragState>(dragKey);
          if (!st || st.pointerId !== e.pointerId) return;
          endDrag(e, ctx);
        },
      } satisfies Gesture,
    ],
  };
}
