import type { NodeData } from '../../../core/types';
import type { ChangeMeta, Command, InfiniteMapPlugin, MapContext, NodePatch } from '../../types';

function getSelectionService(ctx: MapContext) {
  return ctx.getService<{ getIds: () => string[] }>('selection');
}

function getDocumentService(ctx: MapContext) {
  return ctx.getService<{ applyPatches: (patches: NodePatch[], meta: ChangeMeta) => void }>('document');
}

function sortedByZ(nodes: NodeData[]) {
  return [...nodes].sort((a, b) => {
    const za = a.z ?? 0;
    const zb = b.z ?? 0;
    if (za !== zb) return za - zb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function normalizeZ(nodes: NodeData[]) {
  const ordered = sortedByZ(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const patches: NodePatch[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const id = ordered[i].id;
    const cur = byId.get(id);
    if (!cur) continue;
    if ((cur.z ?? 0) !== i) patches.push({ type: 'set', id, data: { z: i } });
  }
  return patches;
}

function bringToFrontPatches(nodes: NodeData[], selectedIds: string[]) {
  const sel = new Set(selectedIds);
  const ordered = sortedByZ(nodes);
  const kept = ordered.filter((n) => !sel.has(n.id));
  const moved = ordered.filter((n) => sel.has(n.id));
  const next = [...kept, ...moved];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const patches: NodePatch[] = [];
  for (let i = 0; i < next.length; i++) {
    const id = next[i].id;
    const cur = byId.get(id);
    if (!cur) continue;
    if ((cur.z ?? 0) !== i) patches.push({ type: 'set', id, data: { z: i } });
  }
  return patches;
}

function sendToBackPatches(nodes: NodeData[], selectedIds: string[]) {
  const sel = new Set(selectedIds);
  const ordered = sortedByZ(nodes);
  const moved = ordered.filter((n) => sel.has(n.id));
  const kept = ordered.filter((n) => !sel.has(n.id));
  const next = [...moved, ...kept];

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const patches: NodePatch[] = [];
  for (let i = 0; i < next.length; i++) {
    const id = next[i].id;
    const cur = byId.get(id);
    if (!cur) continue;
    if ((cur.z ?? 0) !== i) patches.push({ type: 'set', id, data: { z: i } });
  }
  return patches;
}

/**
 * 上移一层：将选中的元素与其上方最近的“非选中元素”交换（整体最多上移 1 层）
 * - 多选时：保持选中元素之间的相对顺序
 */
function bringForwardPatches(nodes: NodeData[], selectedIds: string[]) {
  const sel = new Set(selectedIds);
  const ordered = sortedByZ(nodes);
  const next = [...ordered];
  for (let i = next.length - 2; i >= 0; i--) {
    if (!sel.has(next[i].id)) continue;
    if (sel.has(next[i + 1].id)) continue;
    const tmp = next[i];
    next[i] = next[i + 1];
    next[i + 1] = tmp;
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const patches: NodePatch[] = [];
  for (let i = 0; i < next.length; i++) {
    const id = next[i].id;
    const cur = byId.get(id);
    if (!cur) continue;
    if ((cur.z ?? 0) !== i) patches.push({ type: 'set', id, data: { z: i } });
  }
  return patches;
}

/**
 * 下移一层：将选中的元素与其下方最近的“非选中元素”交换（整体最多下移 1 层）
 * - 多选时：保持选中元素之间的相对顺序
 */
function sendBackwardPatches(nodes: NodeData[], selectedIds: string[]) {
  const sel = new Set(selectedIds);
  const ordered = sortedByZ(nodes);
  const next = [...ordered];
  for (let i = 1; i < next.length; i++) {
    if (!sel.has(next[i].id)) continue;
    if (sel.has(next[i - 1].id)) continue;
    const tmp = next[i];
    next[i] = next[i - 1];
    next[i - 1] = tmp;
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const patches: NodePatch[] = [];
  for (let i = 0; i < next.length; i++) {
    const id = next[i].id;
    const cur = byId.get(id);
    if (!cur) continue;
    if ((cur.z ?? 0) !== i) patches.push({ type: 'set', id, data: { z: i } });
  }
  return patches;
}

export function createZIndexPlugin(): InfiniteMapPlugin {
  const cmdBringToFront: Command = {
    id: 'z.bringToFront',
    title: 'Bring to front',
    run: (ctx) => {
      const ids = getSelectionService(ctx)?.getIds() ?? [];
      if (ids.length === 0) return;
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const patches = bringToFrontPatches(ctx.getNodes(), ids);
      if (patches.length === 0) return;
      doc.applyPatches(patches, { source: 'plugin', plugin: 'zindex', reason: 'keyboard', phase: 'end', ids });
      ctx.requestRender();
    },
  };

  const cmdBringForward: Command = {
    id: 'z.bringForward',
    title: 'Bring forward',
    run: (ctx) => {
      const ids = getSelectionService(ctx)?.getIds() ?? [];
      if (ids.length === 0) return;
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const patches = bringForwardPatches(ctx.getNodes(), ids);
      if (patches.length === 0) return;
      doc.applyPatches(patches, { source: 'plugin', plugin: 'zindex', reason: 'keyboard', phase: 'end', ids });
      ctx.requestRender();
    },
  };

  const cmdSendBackward: Command = {
    id: 'z.sendBackward',
    title: 'Send backward',
    run: (ctx) => {
      const ids = getSelectionService(ctx)?.getIds() ?? [];
      if (ids.length === 0) return;
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const patches = sendBackwardPatches(ctx.getNodes(), ids);
      if (patches.length === 0) return;
      doc.applyPatches(patches, { source: 'plugin', plugin: 'zindex', reason: 'keyboard', phase: 'end', ids });
      ctx.requestRender();
    },
  };

  const cmdSendToBack: Command = {
    id: 'z.sendToBack',
    title: 'Send to back',
    run: (ctx) => {
      const ids = getSelectionService(ctx)?.getIds() ?? [];
      if (ids.length === 0) return;
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const patches = sendToBackPatches(ctx.getNodes(), ids);
      if (patches.length === 0) return;
      doc.applyPatches(patches, { source: 'plugin', plugin: 'zindex', reason: 'keyboard', phase: 'end', ids });
      ctx.requestRender();
    },
  };

  const cmdNormalize: Command = {
    id: 'z.normalize',
    title: 'Normalize z-index',
    run: (ctx) => {
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const patches = normalizeZ(ctx.getNodes());
      if (patches.length === 0) return;
      doc.applyPatches(patches, { source: 'plugin', plugin: 'zindex', reason: 'keyboard', phase: 'end' });
      ctx.requestRender();
    },
  };

  return {
    id: 'zindex',
    provides: ['zindex'],
    requires: ['commands', 'document', 'selection'],
    commands: {
      [cmdBringToFront.id]: cmdBringToFront,
      [cmdBringForward.id]: cmdBringForward,
      [cmdSendBackward.id]: cmdSendBackward,
      [cmdSendToBack.id]: cmdSendToBack,
      [cmdNormalize.id]: cmdNormalize,
    },
  };
}
