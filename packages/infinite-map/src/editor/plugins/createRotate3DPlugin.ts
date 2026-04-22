import type { InfiniteMapPlugin, MapContext, MapPointerEvent, NodePatch } from '../types';
import type { NodeData } from '../../core/types';
import { STORE_KEYS } from '../keys';

type Rotate3DState = {
  pointerId: number;
  id: string;
  startScreen: { x: number; y: number };
  startRotationX: number;
  startRotationY: number;
};

const STORE_KEY = STORE_KEYS.rotate3dState;
const SELECTION_KEY = STORE_KEYS.selectionIds;
const SPACE_KEY = STORE_KEYS.keyboardSpace;

function hitTest(nodes: NodeData[], p: { x: number; y: number }): NodeData | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height) return n;
  }
  return null;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/**
 * 3D 旋转（Alt/Option + 拖拽）
 * - 横向拖动：rotateY
 * - 纵向拖动：rotateX
 *
 * 说明：macOS 下 Option 键会映射到 altKey，因此 modifiers.alt 可用。
 */
export function createRotate3DPlugin(): InfiniteMapPlugin {
  const sensitivity = 0.35; // deg / px

  const start = (e: MapPointerEvent, ctx: MapContext): Rotate3DState | null => {
    const hit = hitTest(ctx.getVisibleNodes(), e.world);
    if (!hit) return null;

    // 若当前未单选命中节点，则切到单选（符合“旋转选中节点”的预期）
    const prevSel = ctx.store.get<string[]>(SELECTION_KEY) ?? [];
    if (!(prevSel.length === 1 && prevSel[0] === hit.id)) {
      ctx.store.set(SELECTION_KEY, [hit.id]);
      ctx.bus.emit('selection:change', { ids: [hit.id] });
      ctx.requestRender();
    }

    const st: Rotate3DState = {
      pointerId: e.pointerId,
      id: hit.id,
      startScreen: { ...e.screen },
      startRotationX: hit.rotationX ?? 0,
      startRotationY: hit.rotationY ?? 0,
    };
    ctx.store.set(STORE_KEY, st);
    ctx.requestRender();
    return st;
  };

  const move = (e: MapPointerEvent, ctx: MapContext): boolean => {
    const st = ctx.store.get<Rotate3DState>(STORE_KEY);
    if (!st || st.pointerId !== e.pointerId) return false;

    const dx = e.screen.x - st.startScreen.x;
    const dy = e.screen.y - st.startScreen.y;

    // 常见 3D 视图习惯：向上拖→抬头(rotateX负)，向右拖→右转(rotateY正)
    const nextX = clamp(st.startRotationX - dy * sensitivity, -89, 89);
    const nextY = st.startRotationY + dx * sensitivity;

    const patches: NodePatch[] = [{ type: 'set', id: st.id, data: { rotationX: nextX, rotationY: nextY } }];
    ctx.applyPatches(patches, { source: 'plugin', plugin: 'rotate3d', reason: 'drag', phase: 'move', ids: [st.id] });
    ctx.requestRender();
    return true;
  };

  const end = (e: MapPointerEvent, ctx: MapContext): boolean => {
    const st = ctx.store.get<Rotate3DState>(STORE_KEY);
    if (!st || st.pointerId !== e.pointerId) return false;
    move(e, ctx);
    ctx.store.set(STORE_KEY, null);
    ctx.requestRender();
    return true;
  };

  return {
    id: 'rotate3d',
    handlers: {
      onPointerDown: (e, ctx) => {
        if (e.button !== 0) return { handled: false };
        if (!e.modifiers.alt) return { handled: false };
        if (ctx.store.get<boolean>(SPACE_KEY)) return { handled: false };
        const st = start(e, ctx);
        if (!st) return { handled: false };
        // stop：优先于 drag/marquee
        return { handled: true };
      },
      onPointerMove: (e, ctx) => {
        const st = ctx.store.get<Rotate3DState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        move(e, ctx);
        return { handled: true };
      },
      onPointerUp: (e, ctx) => {
        const st = ctx.store.get<Rotate3DState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        end(e, ctx);
        return { handled: true };
      },
      onPointerCancel: (e, ctx) => {
        const st = ctx.store.get<Rotate3DState>(STORE_KEY);
        if (!st || st.pointerId !== e.pointerId) return { handled: false };
        end(e, ctx);
        return { handled: true };
      },
    },
  };
}
