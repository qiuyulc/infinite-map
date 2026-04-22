import type { NodeData } from '../../core/types';
import { STORE_KEYS } from '../keys';
import type { ChangeMeta, Command, InfiniteMapPlugin, MapContext, NodePatch, Point } from '../types';

type ClipboardData = {
  nodes: NodeData[]; // snapshot
  bbox: { x: number; y: number; w: number; h: number };
};

function computeBBox(nodes: NodeData[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

function genId() {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function centerWorld(ctx: MapContext): Point {
  const camSvc = ctx.getService<{ get: () => { x: number; y: number; zoom: number } }>('camera');
  const cam = camSvc?.get?.() ?? ctx.getCamera();
  const vp = ctx.getViewport();
  const z = cam.zoom || 1;
  return { x: cam.x + vp.w / (2 * z), y: cam.y + vp.h / (2 * z) };
}

function getSelectionService(ctx: MapContext) {
  return ctx.getService<{ getIds: () => string[]; setIds: (ids: string[]) => void; clear: () => void }>('selection');
}

function getDocumentService(ctx: MapContext) {
  return ctx.getService<{ applyPatches: (patches: NodePatch[], meta: ChangeMeta) => void }>('document');
}

export type ClipboardPluginOptions = {
  /**
   * 每次 paste/duplicate 的世界坐标偏移（用于连续叠放）
   */
  offsetWorld?: number;
};

export function createClipboardPlugin(opts: ClipboardPluginOptions = {}): InfiniteMapPlugin {
  const offsetWorld = opts.offsetWorld ?? 24;

  const cmdCopy: Command = {
    id: 'edit.copy',
    title: 'Copy',
    shortcut: 'Mod+C',
    run: (ctx) => {
      const sel = getSelectionService(ctx);
      const ids = sel?.getIds() ?? [];
      if (ids.length === 0) return;
      const byId = new Map(ctx.getNodes().map((n) => [n.id, n]));
      const nodes = ids.map((id) => byId.get(id)).filter(Boolean) as NodeData[];
      if (nodes.length === 0) return;
      const bbox = computeBBox(nodes);
      ctx.store.set<ClipboardData>(STORE_KEYS.clipboardData, { nodes: nodes.map((n) => ({ ...n })), bbox });
      ctx.store.set<number>(STORE_KEYS.clipboardPasteCount, 0);
    },
  };

  const cmdDelete: Command = {
    id: 'edit.delete',
    title: 'Delete',
    shortcut: 'Delete / Backspace',
    run: (ctx) => {
      const sel = getSelectionService(ctx);
      const ids = sel?.getIds() ?? [];
      if (ids.length === 0) return;
      const doc = getDocumentService(ctx);
      doc?.applyPatches(
        ids.map((id) => ({ type: 'remove', id })),
        { source: 'plugin', plugin: 'clipboard', reason: 'delete', phase: 'end', ids }
      );
      sel?.clear();
      ctx.requestRender();
    },
  };

  const cmdCut: Command = {
    id: 'edit.cut',
    title: 'Cut',
    shortcut: 'Mod+X',
    run: (ctx, payload) => {
      cmdCopy.run(ctx, payload);
      cmdDelete.run(ctx, payload);
    },
  };

  const cmdPaste: Command = {
    id: 'edit.paste',
    title: 'Paste',
    shortcut: 'Mod+V',
    run: (ctx) => {
      const data = ctx.store.get<ClipboardData>(STORE_KEYS.clipboardData);
      if (!data || data.nodes.length === 0) return;
      const doc = getDocumentService(ctx);
      const sel = getSelectionService(ctx);
      if (!doc) return;

      const pasteCount = ctx.store.get<number>(STORE_KEYS.clipboardPasteCount) ?? 0;
      const offset = offsetWorld * (pasteCount + 1);
      const center = centerWorld(ctx);
      const targetTopLeft = { x: center.x - data.bbox.w / 2 + offset, y: center.y - data.bbox.h / 2 + offset };
      const dx = targetTopLeft.x - data.bbox.x;
      const dy = targetTopLeft.y - data.bbox.y;

      const newNodes: NodeData[] = data.nodes.map((n) => ({ ...n, id: genId(), x: n.x + dx, y: n.y + dy }));
      doc.applyPatches(
        newNodes.map((node) => ({ type: 'add', node })),
        { source: 'plugin', plugin: 'clipboard', reason: 'paste', phase: 'end', ids: newNodes.map((n) => n.id) }
      );
      sel?.setIds(newNodes.map((n) => n.id));
      ctx.store.set<number>(STORE_KEYS.clipboardPasteCount, pasteCount + 1);
      ctx.requestRender();
    },
  };

  const cmdDuplicate: Command = {
    id: 'edit.duplicate',
    title: 'Duplicate',
    shortcut: 'Mod+D',
    run: (ctx) => {
      const sel = getSelectionService(ctx);
      const ids = sel?.getIds() ?? [];
      if (ids.length === 0) return;
      const byId = new Map(ctx.getNodes().map((n) => [n.id, n]));
      const nodes = ids.map((id) => byId.get(id)).filter(Boolean) as NodeData[];
      if (nodes.length === 0) return;
      const doc = getDocumentService(ctx);
      if (!doc) return;
      const newNodes: NodeData[] = nodes.map((n) => ({ ...n, id: genId(), x: n.x + offsetWorld, y: n.y + offsetWorld }));
      doc.applyPatches(
        newNodes.map((node) => ({ type: 'add', node })),
        { source: 'plugin', plugin: 'clipboard', reason: 'duplicate', phase: 'end', ids: newNodes.map((n) => n.id) }
      );
      sel?.setIds(newNodes.map((n) => n.id));
      ctx.requestRender();
    },
  };

  return {
    id: 'clipboard',
    provides: ['clipboard'],
    requires: ['commands', 'selection', 'document'],
    order: { after: ['selection'] },
    commands: {
      [cmdCopy.id]: cmdCopy,
      [cmdCut.id]: cmdCut,
      [cmdPaste.id]: cmdPaste,
      [cmdDelete.id]: cmdDelete,
      [cmdDuplicate.id]: cmdDuplicate,
    },
  };
}
