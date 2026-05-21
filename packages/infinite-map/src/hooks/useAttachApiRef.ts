import { useEffect } from 'react';
import type { Camera, NodeData, Rect } from '../core/types';
import { cameraForTopLeftOrigin } from '../core/utils';
import { parseDoc, serializeDoc } from '../editor/document';
import type { ChangeMeta, Command, InfiniteMapPlugin, MapContext, NodePatch } from '../editor/types';
import type { InfiniteMapApi } from '../components/InfiniteMap';
import { STORE_KEYS } from '../editor/keys';

export function useAttachApiRef({
  apiRef,
  plugins,
  ctx,
  commitCamera,
  runCommandWithHooks,
  getNodeRect,
  getSelectionRect,
  onNodesChange,
  applyPatches,
}: {
  apiRef?: React.MutableRefObject<InfiniteMapApi | null> | undefined;
  plugins?: InfiniteMapPlugin[];
  ctx: MapContext;
  commitCamera: (next: Camera, immediate: boolean) => void;
  runCommandWithHooks: (id: string, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api';[k: string]: unknown }) => boolean;
  getNodeRect: (id: string) => Rect | null;
  getSelectionRect: () => Rect | null;
  onNodesChange?: (nextNodes: NodeData[], meta: ChangeMeta) => void;
  applyPatches: (patches: NodePatch[], meta: ChangeMeta) => void;
}) {
  useEffect(() => {
    const hasPlugins = plugins && plugins.length > 0;
    const api: InfiniteMapApi = {
      undo: () => ctx.bus.emit('history:undo', { source: 'api' }),
      redo: () => ctx.bus.emit('history:redo', { source: 'api' }),
      canUndo: () => (ctx.store.get<unknown[]>(STORE_KEYS.historyUndoStack)?.length ?? 0) > 0,
      canRedo: () => (ctx.store.get<unknown[]>(STORE_KEYS.historyRedoStack)?.length ?? 0) > 0,
      subscribeHistory: (listener) => ctx.store.subscribe(STORE_KEYS.historyVersion, listener),
      runCommand: (id, payload) => {
        const source = (payload?.source ?? 'api') as 'keyboard' | 'toolbar' | 'menu' | 'api';
        const rest = (payload ?? {}) as Record<string, unknown>;
        return runCommandWithHooks(id, { ...rest, source });
      },
      getCommands: () => Object.values(ctx.store.get<Record<string, Command>>('commands:registry') ?? {}),
      getCommand: (id) => (ctx.store.get<Record<string, Command>>('commands:registry') ?? {})[id],
      subscribe: (type, handler) => ctx.bus.on(type, handler as any),
      getSelectionIds: () => ctx.getService<{ getIds: () => string[] }>('selection')?.getIds?.() ?? [],
      setSelectionIds: (ids) => {
        const sel = ctx.getService<{ setIds?: (ids: string[]) => void; clear?: () => void }>('selection');
        if (!sel?.setIds) throw new Error('[InfiniteMapApi.setSelectionIds] selection service is not available (did you enable selection plugin?)');
        sel.setIds(ids);
      },
      subscribeSelection: (listener) => ctx.bus.on('selection:change', listener),
      getNodeRect,
      getSelectionRect,
      getCamera: () => ctx.getCamera(),
      setCamera: (next, opts) => commitCamera(next, Boolean(opts?.immediate)),
      getContainerTopLeft: () => { const cam = ctx.getCamera(); const vp = ctx.getViewport(); const z = cam.zoom || 1; return { x: cam.x - vp.w / (2 * z), y: cam.y - vp.h / (2 * z) }; },
      moveOriginToTopLeft: () => {
        const cam = ctx.getCamera();
        const vp = ctx.getViewport();
        commitCamera(cameraForTopLeftOrigin(vp, cam.zoom), true);
      },
      subscribeCamera: (listener) => ctx.bus.on('camera:changed', ({ camera }) => listener(camera)),
      getNodes: () => ctx.getNodes(),
      serializeDoc: (meta) => serializeDoc({ nodes: ctx.getNodes(), camera: ctx.getCamera(), meta }),
      parseDoc: (doc, opts) => {
        const next = parseDoc(doc);
        commitCamera(next.camera, Boolean(opts?.immediate));
        if (!onNodesChange) {
          throw new Error('[InfiniteMapApi.parseDoc] onNodesChange is required to apply imported nodes');
        }
        onNodesChange(next.nodes, { source: 'plugin', plugin: 'api', reason: 'import' });
      },
      applyPatches: (patches, meta) => {
        applyPatches(patches, {
          source: 'plugin',
          plugin: 'api',
          reason: 'import',
          ids: patches.map((p) => (p as any).id ?? (p as any).node?.id).filter(Boolean),
          ...(meta ?? {}),
        } as ChangeMeta);
      },
      updateNodeData: (idOrData, data) => {
        const getSelectionIds = () => ctx.getService<{ getIds: () => string[] }>('selection')?.getIds?.() ?? [];
        let id: string;
        let value: unknown;
        if (typeof idOrData === 'string') {
          id = idOrData;
          value = data;
        } else {
          const ids = getSelectionIds();
          if (ids.length === 0) throw new Error('[InfiniteMapApi.updateNodeData] no node selected');
          id = ids[0];
          value = idOrData;
        }
        applyPatches([{ type: 'set', id, data: { data: value } }], {
          source: 'plugin',
          plugin: 'api',
          reason: 'import',
          ids: [id],
        } as ChangeMeta);
      },
    };

    // apiRef 仅在有请求时设置
    if (apiRef) apiRef.current = hasPlugins ? api : null;

    return () => {
      if (apiRef) apiRef.current = null;
    };
  }, [apiRef, ctx, plugins, commitCamera, runCommandWithHooks, getNodeRect, getSelectionRect, onNodesChange, applyPatches]);
}