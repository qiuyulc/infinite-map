import type { InfiniteMapPlugin, MapPointerEvent } from '../types';
import type { NodeData } from '../../core/types';
import { SelectionOverlay } from './SelectionOverlay';
import { STORE_KEYS } from '../keys';

export type SelectionPluginOptions = {
  /**
   * store key（方便未来做多个 selection scope）
   */
  storeKey?: string;
  /**
   * 点击空白时是否清空选择
   */
  clearOnBlankClick?: boolean;
};

const DEFAULT_KEY = STORE_KEYS.selectionIds;
const SPACE_KEY = STORE_KEYS.keyboardSpace;

function isResizeHandleEvent(e: MapPointerEvent): boolean {
  const oe = e.originalEvent as unknown as { target?: unknown } | null;
  const target = (oe?.target ?? null) as HTMLElement | null;
  if (!target) return false;
  return Boolean(target.closest?.('[data-handle],[data-rotate-handle]'));
}

function hitTest(nodes: NodeData[], p: { x: number; y: number }): NodeData | null {
  // 从后往前：模拟“后渲染的在上层”（更接近 DOM 层级直觉）
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
    handlers: {
      onPointerDown: (e: MapPointerEvent, ctx) => {
        // 只响应主键（左键）
        if (e.button !== 0) return { handled: false };
        // Space：平移模式，selection 不抢事件
        if (ctx.store.get<boolean>(SPACE_KEY)) return { handled: false };
        // 点在 resize handle 上：不要当成“空白点击”清空 selection，让 resize 插件接管
        if (isResizeHandleEvent(e)) return { handled: true, mode: 'continue' };

        const hit = hitTest(ctx.getVisibleNodes(), e.world);
        if (!hit) {
          if (clearOnBlankClick && !e.modifiers.shift) {
            const prev = ctx.store.get<string[]>(storeKey) ?? [];
            if (prev.length > 0) {
              ctx.store.set(storeKey, []);
              ctx.bus.emit('selection:change', { ids: [] });
              ctx.requestRender();
            }
          }
          // 空白处不拦截：让 core 去 pan
          return { handled: false };
        }

        const prev = ctx.store.get<string[]>(storeKey) ?? [];
        // 选择规则（贴近常见编辑器）：
        // - Shift：切换选中（toggle）
        // - 非 Shift：
        //   - 点击已选中的节点：保持当前多选不变（便于拖动多选组）
        //   - 点击未选中的节点：变为单选该节点
        const next = e.modifiers.shift ? toggle(prev, hit.id) : prev.includes(hit.id) ? prev : [hit.id];

        // 无变化就不触发
        if (next.length === prev.length && next.every((x, i) => x === prev[i])) {
          // 依然继续传播：允许 drag 插件接管拖拽
          return { handled: true, mode: 'continue' };
        }

        ctx.store.set(storeKey, next);
        ctx.bus.emit('selection:change', { ids: next });
        ctx.requestRender();

        // 命中节点时继续传播：
        // - 允许后续 drag 插件接管拖拽
        // - 最终由 drag 插件 stop，阻止画布平移
        return { handled: true, mode: 'continue' };
      },
    },
  };
}
