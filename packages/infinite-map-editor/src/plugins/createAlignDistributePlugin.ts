import type { ChangeMeta, Command, InfiniteMapPlugin, MapContext, NodeData, NodePatch } from '@qiuyulc/infinite-map';
import { buildById, isLockedEffective } from '../editor/groupUtils';

type AlignKind = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom';
type DistributeKind = 'h' | 'v';

function getSelectionIds(ctx: MapContext): string[] {
  return ctx.getService<{ getIds?: () => string[] }>('selection')?.getIds?.() ?? [];
}

function applyPatches(ctx: MapContext, patches: NodePatch[], meta: ChangeMeta) {
  const doc = ctx.getService<{ applyPatches?: (patches: NodePatch[], meta: ChangeMeta) => void }>('document');
  if (doc?.applyPatches) doc.applyPatches(patches, meta);
  else ctx.applyPatches(patches, meta);
}

function getMovableNodes(ctx: MapContext, ids: string[]): NodeData[] {
  const nodes = ctx.getNodes();
  const byId = buildById(nodes);
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((n) => !isLockedEffective(nodes, n!.id)) as NodeData[];
}

function rectOf(n: NodeData) {
  return { x: n.x, y: n.y, w: n.width, h: n.height };
}

function unionRect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function computeBBox(nodes: NodeData[]) {
  let out: { x: number; y: number; w: number; h: number } | null = null;
  for (const n of nodes) out = out ? unionRect(out, rectOf(n)) : rectOf(n);
  return out;
}

function align(ctx: MapContext, kind: AlignKind) {
  const ids = getSelectionIds(ctx);
  const picked = getMovableNodes(ctx, ids);
  if (picked.length < 2) return;

  const bbox = computeBBox(picked);
  if (!bbox) return;

  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const patches: NodePatch[] = [];

  for (const n of picked) {
    let x = n.x;
    let y = n.y;
    if (kind === 'left') x = bbox.x;
    if (kind === 'right') x = bbox.x + bbox.w - n.width;
    if (kind === 'hcenter') x = cx - n.width / 2;
    if (kind === 'top') y = bbox.y;
    if (kind === 'bottom') y = bbox.y + bbox.h - n.height;
    if (kind === 'vcenter') y = cy - n.height / 2;
    if (x !== n.x || y !== n.y) patches.push({ type: 'move', id: n.id, x, y });
  }

  if (patches.length === 0) return;
  applyPatches(ctx, patches, { source: 'plugin', plugin: 'align-distribute', reason: 'align', phase: 'end', ids });
  ctx.requestRender();
}

function distribute(ctx: MapContext, kind: DistributeKind) {
  const ids = getSelectionIds(ctx);
  const picked = getMovableNodes(ctx, ids);
  if (picked.length < 3) return;

  const items = [...picked];
  if (kind === 'h') items.sort((a, b) => a.x - b.x);
  else items.sort((a, b) => a.y - b.y);

  const bbox = computeBBox(items);
  if (!bbox) return;

  const totalSize = items.reduce((s, n) => s + (kind === 'h' ? n.width : n.height), 0);
  const span = kind === 'h' ? bbox.w : bbox.h;
  const gap = (span - totalSize) / (items.length - 1);
  if (!Number.isFinite(gap)) return;

  const patches: NodePatch[] = [];
  let cursor = kind === 'h' ? bbox.x : bbox.y;
  for (const n of items) {
    if (kind === 'h') {
      if (n.x !== cursor) patches.push({ type: 'move', id: n.id, x: cursor, y: n.y });
      cursor += n.width + gap;
    } else {
      if (n.y !== cursor) patches.push({ type: 'move', id: n.id, x: n.x, y: cursor });
      cursor += n.height + gap;
    }
  }

  if (patches.length === 0) return;
  applyPatches(ctx, patches, { source: 'plugin', plugin: 'align-distribute', reason: 'distribute', phase: 'end', ids });
  ctx.requestRender();
}

export function createAlignDistributePlugin(): InfiniteMapPlugin {
  const cmd = (id: string, title: string, run: (ctx: MapContext) => void): Command => ({ id, title, run });

  return {
    id: 'align-distribute',
    provides: ['align', 'distribute'],
    requires: ['document', 'selection', 'commands'],
    commands: {
      // Align
      'edit.alignLeft': cmd('edit.alignLeft', 'Align Left', (ctx) => align(ctx, 'left')),
      'edit.alignHCenter': cmd('edit.alignHCenter', 'Align Horizontal Center', (ctx) => align(ctx, 'hcenter')),
      'edit.alignRight': cmd('edit.alignRight', 'Align Right', (ctx) => align(ctx, 'right')),
      'edit.alignTop': cmd('edit.alignTop', 'Align Top', (ctx) => align(ctx, 'top')),
      'edit.alignVCenter': cmd('edit.alignVCenter', 'Align Vertical Center', (ctx) => align(ctx, 'vcenter')),
      'edit.alignBottom': cmd('edit.alignBottom', 'Align Bottom', (ctx) => align(ctx, 'bottom')),
      // Distribute
      'edit.distributeH': cmd('edit.distributeH', 'Distribute Horizontally', (ctx) => distribute(ctx, 'h')),
      'edit.distributeV': cmd('edit.distributeV', 'Distribute Vertically', (ctx) => distribute(ctx, 'v')),
    },
  };
}
