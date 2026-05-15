import { memo, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  type Camera,
  type InfiniteMapPlugin,
  type MapContext,
  type NodeData,
} from '@qiuyulc/infinite-map';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DropToCreatePluginOptions = {
  resolveType: (e: DragEvent) => string | null;
  createNode: (type: string, worldPos: { x: number; y: number }, e: DragEvent) => NodeData | null;
  ghost?: boolean | {
    render?: (type: string, worldPos: { x: number; y: number }) => ReactNode;
  };
};

// ---------------------------------------------------------------------------
// Store keys
// ---------------------------------------------------------------------------

const GHOST_KEY = 'drop-to-create:ghost';

type GhostState = {
  type: string;
  worldX: number;
  worldY: number;
  visible: boolean;
};

// ---------------------------------------------------------------------------
// Ghost overlay
// ---------------------------------------------------------------------------

type GhostOverlayProps = {
  ctx: MapContext;
  ghost: DropToCreatePluginOptions['ghost'];
};

const DropGhostOverlay = memo(function DropGhostOverlay({ ctx, ghost }: GhostOverlayProps) {
  const engine = ctx.getService<{ cameraRef: React.MutableRefObject<Camera> }>('engine');
  const [, bump] = useState(0);
  const lastRef = useRef<GhostState>({ type: '', worldX: 0, worldY: 0, visible: false });

  useEffect(() => {
    const init = ctx.store.get<GhostState>(GHOST_KEY);
    if (init) lastRef.current = init;
    return ctx.store.subscribe(GHOST_KEY, () => {
      const next = ctx.store.get<GhostState>(GHOST_KEY);
      if (next) lastRef.current = next;
      bump((v) => v + 1);
    });
  }, [ctx.store]);

  const g = lastRef.current;
  if (!g.visible || !engine) return null;

  const screenPos = ctx.worldToScreen({ x: g.worldX, y: g.worldY });
  const screenX = screenPos.x;
  const screenY = screenPos.y;

  const customRender = typeof ghost === 'object' ? ghost.render : undefined;
  if (customRender) {
    return (
      <div style={{ position: 'absolute', left: screenX, top: screenY, pointerEvents: 'none', opacity: 0.55 }}>
        {customRender(g.type, { x: g.worldX, y: g.worldY })}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: 140,
        height: 70,
        background: 'rgba(59, 130, 246, 0.18)',
        border: '2px dashed rgba(59, 130, 246, 0.45)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(59, 130, 246, 0.65)',
        fontSize: 13,
        fontWeight: 600,
        pointerEvents: 'none',
      }}
    >
      {g.type}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Plugin factory
// ---------------------------------------------------------------------------

export function createDropToCreatePlugin(opts: DropToCreatePluginOptions): InfiniteMapPlugin {
  const ghostEnabled = opts.ghost !== false;

  return {
    id: 'drop-to-create',
    provides: ['dropToCreate'],
    slot: ghostEnabled ? 'overlay' : undefined,
    overlay: ghostEnabled
      ? function Overlay({ ctx }: { ctx: MapContext }) {
          return <DropGhostOverlay ctx={ctx} ghost={opts.ghost} />;
        }
      : undefined,
    overlayPointerEvents: 'none',

    setup(ctx) {
      let dropLocked = false;

      const getContainer = (e: DragEvent): HTMLElement | null => {
        const el = e.target as HTMLElement | null;
        return el?.closest('[data-im-theme]') as HTMLElement | null;
      };

      const setGhost = (s: GhostState) => {
        if (!ghostEnabled) return;
        ctx.store.set(GHOST_KEY, s);
        ctx.requestRender();
      };
      const clearGhost = () => setGhost({ type: '', worldX: 0, worldY: 0, visible: false });

      const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';

        const type = opts.resolveType(e);
        if (!type) { clearGhost(); return; }

        const container = getContainer(e);
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const world = ctx.screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top });

        setGhost({
          type,
          worldX: world.x,
          worldY: world.y,
          visible: true,
        });
      };

      const onDrop = (e: DragEvent) => {
        // 同步锁 + 阻止冒泡：确保任何情况下只处理一次
        if (dropLocked) return;
        dropLocked = true;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        clearGhost();

        const type = opts.resolveType(e);
        if (!type) { dropLocked = false; return; }

        const container = getContainer(e);
        if (!container) { dropLocked = false; return; }

        const rect = container.getBoundingClientRect();
        const world = ctx.screenToWorld({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        const worldX = world.x;
        const worldY = world.y;

        const node = opts.createNode(type, { x: worldX, y: worldY }, e);
        if (!node) { dropLocked = false; return; }

        const doc = ctx.getService<{ applyPatches: (p: any[], m: any) => void }>('document');
        const applyPatches = doc?.applyPatches ?? ctx.applyPatches;
        applyPatches(
          [{ type: 'add', node }],
          { source: 'plugin', plugin: 'drop-to-create', reason: 'drop' as any, phase: 'end', ids: [node.id] },
        );

        const sel = ctx.getService<{ setIds: (ids: string[]) => void }>('selection');
        sel?.setIds([node.id]);
        ctx.requestRender();

        // 解锁：延迟到下一帧，确保所有同步副作用完成
        requestAnimationFrame(() => { dropLocked = false; });
      };

      const onDragLeave = (e: DragEvent) => {
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth - 1 || e.clientY >= window.innerHeight - 1) {
          clearGhost();
        }
      };

      document.addEventListener('dragover', onDragOver);
      document.addEventListener('drop', onDrop);
      document.addEventListener('dragleave', onDragLeave);

      return () => {
        document.removeEventListener('dragover', onDragOver);
        document.removeEventListener('drop', onDrop);
        document.removeEventListener('dragleave', onDragLeave);
        clearGhost();
      };
    },
  };
}
