import { useCallback, useRef } from 'react';
import { applyPatchesToNodes } from '../editor/runtime';
import type { NodeData } from '../core/types';
import type { ChangeMeta, EditorErrorInfo, NodePatch } from '../editor/types';

export type PatchEngineOptions = {
  bus: { emit: (type: 'patches:applied', payload: any) => void };
  nodesRef: React.MutableRefObject<NodeData[]>;
  onNodesChangeRef: React.MutableRefObject<((nodes: NodeData[], meta: ChangeMeta) => void) | undefined>;
  onPatchesRef: React.MutableRefObject<((patches: NodePatch[], meta: ChangeMeta) => void) | undefined>;
  hooksRef: React.MutableRefObject<
    | {
        onBeforeApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => NodePatch[] | void;
        onAfterApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => void;
        [k: string]: unknown;
      }
    | null
    | undefined
  >;
  hookModeRef: React.MutableRefObject<'intercept' | 'observe'>;
  onEditorErrorRef: React.MutableRefObject<((err: unknown, info: EditorErrorInfo) => void) | undefined>;
};

/**
 * patches 引擎：
 * - move-phase patches：合并到 rAF 批量提交（减少重渲染）
 * - history 支持：提交前采样 beforeById，并 emit patches:applied
 * - hooks：onBeforeApplyPatches/onAfterApplyPatches
 */
export function usePatchEngine({
  bus,
  nodesRef,
  onNodesChangeRef,
  onPatchesRef,
  hooksRef,
  hookModeRef,
  onEditorErrorRef,
}: PatchEngineOptions) {
  const pendingMoveRafRef = useRef<number | null>(null);
  const pendingMovePatchesRef = useRef<NodePatch[] | null>(null);
  const pendingMoveMetaRef = useRef<ChangeMeta | null>(null);

  const mergeMovePatches = (base: NodePatch[] | null, next: NodePatch[]) => {
    // 目标：同一帧内对同一节点的 move/set 取“最后一次”，减少 patch 数量与重渲染
    const moveById = new Map<string, NodePatch & { type: 'move' }>();
    const setById = new Map<string, NodePatch & { type: 'set' }>();
    const others: NodePatch[] = [];

    const consume = (arr: NodePatch[]) => {
      for (const p of arr) {
        if (p.type === 'move') {
          moveById.set(p.id, p);
        } else if (p.type === 'set') {
          const prev = setById.get(p.id);
          setById.set(p.id, prev ? ({ ...p, data: { ...(prev.data ?? {}), ...(p.data ?? {}) } } as any) : p);
        } else {
          others.push(p);
        }
      }
    };
    if (base && base.length) consume(base);
    if (next && next.length) consume(next);

    return [...others, ...setById.values(), ...moveById.values()];
  };

  const flushPendingMovePatches = useCallback(() => {
    const patches = pendingMovePatchesRef.current;
    const meta = pendingMoveMetaRef.current;
    pendingMovePatchesRef.current = null;
    pendingMoveMetaRef.current = null;
    if (pendingMoveRafRef.current != null) {
      cancelAnimationFrame(pendingMoveRafRef.current);
      pendingMoveRafRef.current = null;
    }
    if (!patches || patches.length === 0 || !meta) return;

    // history：采样本次变更涉及到的节点“变更前”快照
    const beforeById: Record<string, NodeData | undefined> = {};
    const byId = new Map(nodesRef.current.map((n) => [n.id, n]));
    for (const p of patches) {
      if (p.type === 'add') {
        const id = p.node.id;
        if (!(id in beforeById)) beforeById[id] = byId.get(id);
      } else {
        const id = p.id;
        if (!(id in beforeById)) beforeById[id] = byId.get(id);
      }
    }
    bus.emit('patches:applied', { patches, meta, beforeById });
    onPatchesRef.current?.(patches, meta);
    if (onNodesChangeRef.current) {
      const next = applyPatchesToNodes(nodesRef.current, patches);
      nodesRef.current = next;
      onNodesChangeRef.current(next, meta);
    }
    try {
      hooksRef.current?.onAfterApplyPatches?.(patches, meta);
    } catch (err) {
      onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onAfterApplyPatches' });
    }
  }, [bus, hooksRef, nodesRef, onEditorErrorRef, onNodesChangeRef, onPatchesRef]);

  const applyPatches = useCallback(
    (patches: NodePatch[], meta: ChangeMeta) => {
      if (!patches || patches.length === 0) return;

      // 若有 move-phase 队列，而当前不是 move，则先 flush，保证顺序正确
      if (pendingMovePatchesRef.current && meta.phase !== 'move') {
        flushPendingMovePatches();
      }

      let usePatches = patches;
      const hook = hooksRef.current?.onBeforeApplyPatches;
      if (hook) {
        try {
          const nextPatches = hook(patches, meta);
          if (hookModeRef.current === 'intercept' && Array.isArray(nextPatches)) {
            usePatches = nextPatches;
          }
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onBeforeApplyPatches' });
        }
      }
      if (!usePatches || usePatches.length === 0) return;

      // move-phase：rAF 合并后再提交，避免高频 setState/重渲染导致卡顿和“闪烁”
      if (meta.phase === 'move') {
        pendingMovePatchesRef.current = mergeMovePatches(pendingMovePatchesRef.current, usePatches);
        pendingMoveMetaRef.current = pendingMoveMetaRef.current
          ? { ...meta, ids: Array.from(new Set([...(pendingMoveMetaRef.current.ids ?? []), ...(meta.ids ?? [])])) }
          : meta;
        if (pendingMoveRafRef.current == null) {
          pendingMoveRafRef.current = requestAnimationFrame(() => {
            pendingMoveRafRef.current = null;
            flushPendingMovePatches();
          });
        }
        return;
      }

      // history：采样本次变更涉及到的节点“变更前”快照
      const beforeById: Record<string, NodeData | undefined> = {};
      const byId = new Map(nodesRef.current.map((n) => [n.id, n]));
      for (const p of usePatches) {
        if (p.type === 'add') {
          const id = p.node.id;
          if (!(id in beforeById)) beforeById[id] = byId.get(id);
        } else {
          const id = p.id;
          if (!(id in beforeById)) beforeById[id] = byId.get(id);
        }
      }
      bus.emit('patches:applied', { patches: usePatches, meta, beforeById });
      onPatchesRef.current?.(usePatches, meta);
      if (onNodesChangeRef.current) {
        // 关键：同步更新 nodesRef，避免短时间内连续 applyPatches（例如快速 undo/redo）
        // 仍然基于旧 nodesRef 计算，导致后续操作一直在“旧快照”上叠加从而界面不更新。
        const next = applyPatchesToNodes(nodesRef.current, usePatches);
        nodesRef.current = next;
        onNodesChangeRef.current(next, meta);
      }
      try {
        hooksRef.current?.onAfterApplyPatches?.(usePatches, meta);
      } catch (err) {
        onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onAfterApplyPatches' });
      }
    },
    [flushPendingMovePatches, hookModeRef, hooksRef, nodesRef, onEditorErrorRef, onNodesChangeRef, onPatchesRef, bus]
  );

  return { applyPatches, flushPendingMovePatches };
}
