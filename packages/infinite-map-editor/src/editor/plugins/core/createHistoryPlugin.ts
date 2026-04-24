import type { ChangeMeta, InfiniteMapPlugin, MapContext, NodePatch } from '../../types';
import type { NodeData } from '../../../core/types';
import { STORE_KEYS } from '../../keys';

type HistoryEntry = {
  doPatches: NodePatch[];
  undoPatches: NodePatch[];
  meta: ChangeMeta;
};

type PendingEntry = {
  key: string;
  undoPatches: NodePatch[];
  lastDoPatches: NodePatch[];
  meta: ChangeMeta;
};

const UNDO_STACK_KEY = STORE_KEYS.historyUndoStack;
const REDO_STACK_KEY = STORE_KEYS.historyRedoStack;
const PENDING_KEY = STORE_KEYS.historyPending;
const VERSION_KEY = STORE_KEYS.historyVersion;

function getNodeById(beforeById: Record<string, NodeData | undefined>, id: string) {
  return beforeById[id];
}

function cancelOngoingInteractions(ctx: MapContext) {
  // 解决“交互中按 undo/redo”的冲突：
  // - 例如 drag 尚未结束时按 Undo：history 会回滚节点，但 drag 插件仍持有旧 startById，
  //   下一次 pointermove 会再次 applyPatches 导致位置闪回。
  ctx.store.set(STORE_KEYS.dragState, null);
  ctx.store.set(STORE_KEYS.resizeState, null);
  ctx.store.set(STORE_KEYS.rotateState, null);
  ctx.store.set(STORE_KEYS.rotate3dState, null);
  ctx.store.set(STORE_KEYS.marqueeState, null);
  ctx.store.set(STORE_KEYS.snapGuides, null);
  ctx.requestRender();
}

function inversePatches(patches: NodePatch[], beforeById: Record<string, NodeData | undefined>): NodePatch[] {
  const out: NodePatch[] = [];
  for (const p of patches) {
    switch (p.type) {
      case 'move': {
        const prev = getNodeById(beforeById, p.id);
        if (!prev) break;
        out.push({ type: 'move', id: p.id, x: prev.x, y: prev.y });
        break;
      }
      case 'set': {
        const prev = getNodeById(beforeById, p.id);
        if (!prev) break;
        const data: Partial<NodeData> = {};
        for (const k of Object.keys(p.data)) {
          (data as Record<string, unknown>)[k] = (prev as Record<string, unknown>)[k];
        }
        out.push({ type: 'set', id: p.id, data });
        break;
      }
      case 'add': {
        out.push({ type: 'remove', id: p.node.id });
        break;
      }
      case 'remove': {
        const prev = getNodeById(beforeById, p.id);
        if (!prev) break;
        out.push({ type: 'add', node: prev });
        break;
      }
    }
  }
  // undo 时需要逆序应用
  return out.reverse();
}

function bumpVersion(ctx: MapContext) {
  const v = ctx.store.get<number>(VERSION_KEY) ?? 0;
  ctx.store.set(VERSION_KEY, v + 1);
}

function pushUndo(ctx: MapContext, entry: HistoryEntry, limit: number) {
  const undoStack = ctx.store.get<HistoryEntry[]>(UNDO_STACK_KEY) ?? [];
  const next = [...undoStack, entry].slice(-limit);
  ctx.store.set(UNDO_STACK_KEY, next);
  ctx.store.set(REDO_STACK_KEY, [] as HistoryEntry[]);
  bumpVersion(ctx);
}

function flushPending(ctx: MapContext, limit: number) {
  const pending = ctx.store.get<PendingEntry>(PENDING_KEY);
  if (!pending) return;
  ctx.store.set(PENDING_KEY, null);
  pushUndo(ctx, { doPatches: pending.lastDoPatches, undoPatches: pending.undoPatches, meta: pending.meta }, limit);
}

function shouldIgnore(meta: ChangeMeta) {
  return meta.reason === 'undo' || meta.reason === 'redo' || meta.plugin === 'history';
}

export type HistoryPluginOptions = {
  limit?: number;
};

export function createHistoryPlugin(opts: HistoryPluginOptions = {}): InfiniteMapPlugin {
  const limit = opts.limit ?? 200;

  return {
    id: 'history',
    provides: ['history'],
    requires: ['commands'],
    commands: {
      'history.undo': {
        id: 'history.undo',
        title: 'Undo',
        shortcut: 'Mod+Z',
        run: (ctx, payload) => ctx.bus.emit('history:undo', { source: payload?.source ?? 'api' }),
      },
      'history.redo': {
        id: 'history.redo',
        title: 'Redo',
        shortcut: 'Mod+Shift+Z',
        run: (ctx, payload) => ctx.bus.emit('history:redo', { source: payload?.source ?? 'api' }),
      },
    },
    setup: (ctx) => {
      if (!ctx.store.get<HistoryEntry[]>(UNDO_STACK_KEY)) ctx.store.set(UNDO_STACK_KEY, [] as HistoryEntry[]);
      if (!ctx.store.get<HistoryEntry[]>(REDO_STACK_KEY)) ctx.store.set(REDO_STACK_KEY, [] as HistoryEntry[]);
      if (ctx.store.get<number>(VERSION_KEY) == null) ctx.store.set(VERSION_KEY, 0);

      // 监听 patches，用于压栈
      ctx.bus.on('patches:applied', ({ patches, meta, beforeById }) => {
        if (!patches || patches.length === 0) return;
        if (shouldIgnore(meta)) return;

        const undo = inversePatches(patches, beforeById);
        if (undo.length === 0) return;

        const key = `${meta.plugin}:${meta.reason}`;
        const phase = meta.phase;

        // move 阶段：合并成一个 pending；end 阶段：落盘
        if (phase === 'move') {
          const pending = ctx.store.get<PendingEntry>(PENDING_KEY);
          if (!pending || pending.key !== key) {
            // 不同动作：先 flush 旧的
            flushPending(ctx, limit);
            ctx.store.set(PENDING_KEY, { key, undoPatches: undo, lastDoPatches: patches, meta });
          } else {
            // 同一个动作：保留最初 undo，更新最后 do
            ctx.store.set(PENDING_KEY, { ...pending, lastDoPatches: patches, meta });
          }
          return;
        }

        if (phase === 'end') {
          const pending = ctx.store.get<PendingEntry>(PENDING_KEY);
          if (pending && pending.key === key) {
            ctx.store.set(PENDING_KEY, { ...pending, lastDoPatches: patches, meta });
            flushPending(ctx, limit);
          } else {
            // 没有 pending，直接当作一次性动作
            pushUndo(ctx, { doPatches: patches, undoPatches: undo, meta }, limit);
          }
          return;
        }

        // 无 phase：直接压栈（例如 add/remove、某些 set）
        flushPending(ctx, limit);
        pushUndo(ctx, { doPatches: patches, undoPatches: undo, meta }, limit);
      });

      // undo/redo 事件（给 toolbar/api 调用）
      ctx.bus.on('history:undo', () => {
        flushPending(ctx, limit);
        cancelOngoingInteractions(ctx);
        const undoStack = ctx.store.get<HistoryEntry[]>(UNDO_STACK_KEY) ?? [];
        if (undoStack.length === 0) return;
        const entry = undoStack[undoStack.length - 1];
        ctx.store.set(UNDO_STACK_KEY, undoStack.slice(0, -1));
        const redoStack = ctx.store.get<HistoryEntry[]>(REDO_STACK_KEY) ?? [];
        ctx.store.set(REDO_STACK_KEY, [...redoStack, entry]);
        bumpVersion(ctx);
        ctx.applyPatches(entry.undoPatches, { source: 'plugin', plugin: 'history', reason: 'undo', phase: 'end', ids: entry.meta.ids });
      });

      ctx.bus.on('history:redo', () => {
        flushPending(ctx, limit);
        cancelOngoingInteractions(ctx);
        const redoStack = ctx.store.get<HistoryEntry[]>(REDO_STACK_KEY) ?? [];
        if (redoStack.length === 0) return;
        const entry = redoStack[redoStack.length - 1];
        ctx.store.set(REDO_STACK_KEY, redoStack.slice(0, -1));
        const undoStack = ctx.store.get<HistoryEntry[]>(UNDO_STACK_KEY) ?? [];
        ctx.store.set(UNDO_STACK_KEY, [...undoStack, entry]);
        bumpVersion(ctx);
        ctx.applyPatches(entry.doPatches, { source: 'plugin', plugin: 'history', reason: 'redo', phase: 'end', ids: entry.meta.ids });
      });
    },
  };
}

