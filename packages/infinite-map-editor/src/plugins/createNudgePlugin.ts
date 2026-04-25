import type { ChangeMeta, InfiniteMapPlugin, MapContext, MapKeyEvent, NodeData, NodePatch } from '@qiuyulc/infinite-map';
import { buildById, isLockedEffective } from '../editor/groupUtils';

export type NudgePluginOptions = {
  step?: number;
  stepLarge?: number;
};

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

export function createNudgePlugin(opts: NudgePluginOptions = {}): InfiniteMapPlugin {
  const step = opts.step ?? 1;
  const stepLarge = opts.stepLarge ?? 10;

  const handle = (e: MapKeyEvent, ctx: MapContext) => {
    if (e.type !== 'down') return { handled: false } as const;
    if (e.modifiers.alt || e.modifiers.ctrl || e.modifiers.meta) return { handled: false } as const;

    let dx = 0;
    let dy = 0;
    switch (e.key) {
      case 'ArrowLeft':
        dx = -1;
        break;
      case 'ArrowRight':
        dx = 1;
        break;
      case 'ArrowUp':
        dy = -1;
        break;
      case 'ArrowDown':
        dy = 1;
        break;
      default:
        return { handled: false } as const;
    }

    const ids = getSelectionIds(ctx);
    if (ids.length === 0) return { handled: false } as const;

    const k = e.modifiers.shift ? stepLarge : step;
    dx *= k;
    dy *= k;

    const picked = getMovableNodes(ctx, ids);
    if (picked.length === 0) return { handled: false } as const;

    const patches: NodePatch[] = picked.map((n) => ({ type: 'move', id: n.id, x: n.x + dx, y: n.y + dy }));
    applyPatches(ctx, patches, { source: 'plugin', plugin: 'nudge', reason: 'keyboard', phase: 'end', ids });
    ctx.requestRender();

    const oe = e.originalEvent as any;
    if (oe?.preventDefault) oe.preventDefault();
    if (oe?.stopPropagation) oe.stopPropagation();
    return { handled: true } as const;
  };

  return {
    id: 'nudge',
    provides: ['nudge'],
    requires: ['selection', 'document'],
    input: {
      onKeyDown: handle,
    },
  };
}

