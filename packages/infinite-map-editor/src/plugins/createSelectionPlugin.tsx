import {
  STORE_KEYS,
  type HitTestContributor,
  type HitTestTarget,
  type InfiniteMapPlugin,
  type MapPointerEvent,
  type NodeData,
  type PointerDownProcessor,
} from '@qiuyulc/infinite-map';
import { SelectionOverlay } from './SelectionOverlay';
import { getOutermostGroupId, isHiddenEffective, isLockedEffective } from '../editor/groupUtils';
import { normalizeHitIdForSelectedGroups } from '../editor/hitNormalize';

export type SelectionPluginOptions = {
  /**
   * store key（方便未来做多个 selection scope）
   */
  storeKey?: string;
  /**
   * 点击空白时是否清空选择
   */
  clearOnBlankClick?: boolean;
  /** 双击 group 节点时是否选中其所有后代子节点（默认 true） */
  dblClickSelectDescendants?: boolean;
  /** 双击间隔阈值（ms，默认 350） */
  dblClickMs?: number;
};

const DEFAULT_KEY = STORE_KEYS.selectionIds;
const SPACE_KEY = STORE_KEYS.keyboardSpace;

type ClickRecord = { time: number; id: string; button: number };

function hitTest(nodes: NodeData[], p: { x: number; y: number }): NodeData | null {
  // 从后往前：模拟"后渲染的在上层"（更接近 DOM 层级直觉）
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height) return n;
  }
  return null;
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function createSelectionPlugin(opts: SelectionPluginOptions = {}): InfiniteMapPlugin {
  const storeKey = opts.storeKey ?? DEFAULT_KEY;
  const clearOnBlankClick = opts.clearOnBlankClick ?? true;
  const dblClickSelectDescendants = opts.dblClickSelectDescendants ?? true;
  const dblClickMs = opts.dblClickMs ?? 350;
  const lastClick: ClickRecord = { time: 0, id: '', button: 0 };

  const nodeHitTest: HitTestContributor = {
    id: 'hit.node',
    priority: -100,
    hitTest: (e, ctx, info) => {
      // pointer/contextmenu 都可用：都带 world
      const hit = hitTest(ctx.getVisibleNodes(), e.world);
      if (!hit) return null;
      if (isHiddenEffective(ctx.getNodes(), hit.id)) return null;
      const id = info.kind === 'contextmenu' ? getOutermostGroupId(ctx.getNodes(), hit.id) : hit.id;
      return { kind: 'node', id, cursor: 'grab' };
    },
  };

  const selectionProcessor: PointerDownProcessor = {
    id: 'selection',
    priority: 0,
    onPointerDown: (e: MapPointerEvent, ctx, hit: HitTestTarget) => {
      // 只响应主键（左键）
      if (e.button !== 0) return;
      // Space：平移模式，selection 不抢事件
      if (ctx.store.get<boolean>(SPACE_KEY)) return;
      // handle 命中：不要当成"空白点击"清空 selection，让对应 gesture 接管
      if (hit.kind === 'handle') return;

      // ------- 双击：穿透提升，直接选中 hit.id -------
      if (dblClickSelectDescendants && hit.kind === 'node') {
        const now = Date.now();
        const isDblClick =
          now - lastClick.time < dblClickMs &&
          lastClick.id === hit.id &&
          lastClick.button === e.button;
        if (isDblClick) {
          lastClick.time = 0;
          lastClick.id = '';
          // 穿透：跳过 promote，直接选中该节点
          const prev = ctx.store.get<string[]>(storeKey) ?? [];
          const next = [hit.id];
          if (!(next.length === prev.length && next.every((x, i) => x === prev[i]))) {
            ctx.store.set(storeKey, next);
            ctx.bus.emit('selection:change', { ids: next });
            ctx.requestRender();
          }
          return;
        }
        lastClick.time = now;
        lastClick.id = hit.id;
        lastClick.button = e.button;
      } else {
        // 点击空白/把手：重置双击追踪
        lastClick.time = 0;
      }

      if (hit.kind === 'blank') {
        if (clearOnBlankClick && !e.modifiers.shift) {
          const prev = ctx.store.get<string[]>(storeKey) ?? [];
          if (prev.length > 0) {
            ctx.store.set(storeKey, []);
            ctx.bus.emit('selection:change', { ids: [] });
            ctx.requestRender();
          }
        }
        // 空白处不阻断：让 core 去 pan
        return;
      }

      const prev = ctx.store.get<string[]>(storeKey) ?? [];

      // 单击子节点自动提升到最外层祖先 group（包括 Shift）
      let hitId = normalizeHitIdForSelectedGroups({
        nodes: ctx.getNodes(),
        hitId: hit.id,
        selectedIds: prev,
        modifiers: { alt: e.modifiers.alt },
      });

      // hidden：不可选（不改变 selection），但不阻断（避免影响 pan/右键等）
      if (isHiddenEffective(ctx.getNodes(), hitId)) return;

      // 选择规则（贴近常见编辑器）：
      // - Shift：切换选中（toggle）
      // - 非 Shift：
      //   - 点击已选中的节点：保持当前多选不变（便于拖动多选组）
      //   - 点击未选中的节点：变为单选该节点
      const next = e.modifiers.shift ? toggle(prev, hitId) : prev.includes(hitId) ? prev : [hitId];

      // 无变化就不触发
      const changed = !(next.length === prev.length && next.every((x, i) => x === prev[i]));
      if (changed) {
        ctx.store.set(storeKey, next);
        ctx.bus.emit('selection:change', { ids: next });
        ctx.requestRender();
      }

      // locked 节点允许被选中（用于解锁等），但阻断后续 gesture（drag/resize/rotate/marquee）
      if (isLockedEffective(ctx.getNodes(), hitId)) return { stop: true, hit: { kind: 'node', id: hitId, cursor: 'grab' } };

      // 关键：把"有效命中"传递给后续 gesture（drag 等），避免出现：
      // - 点击到已选中 group 的子节点时 selection 逻辑认为命中 group
      // - 但 drag gesture 仍然按子节点启动
      if (hitId !== hit.id) return { hit: { kind: 'node', id: hitId, cursor: 'grab' } };
    },
  };

  return {
    id: 'selection',
    provides: ['selection'],
    setup: (ctx) => {
      ctx.registerService('selection', {
        getIds: () => ctx.store.get<string[]>(storeKey) ?? [],
        setIds: (ids: string[]) => {
          ctx.store.set(storeKey, ids);
          ctx.bus.emit('selection:change', { ids });
          ctx.requestRender();
        },
        clear: () => {
          ctx.store.set(storeKey, []);
          ctx.bus.emit('selection:change', { ids: [] });
          ctx.requestRender();
        },
      });
    },
    overlay: SelectionOverlay,
    overlayPointerEvents: 'auto',
    hitTests: [nodeHitTest],
    pointerDownProcessors: [selectionProcessor],
  };
}
