import { useEffect } from 'react';
import type { Camera, NodeData, Rect } from '../core/types';
import { exportDoc, importDoc } from '../editor/document';
import type { ChangeMeta, Command, InfiniteMapPlugin, MapContext } from '../editor/types';
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
}: {
  apiRef?: React.MutableRefObject<InfiniteMapApi | null> | undefined;
  plugins?: InfiniteMapPlugin[];
  ctx: MapContext;
  commitCamera: (next: Camera, immediate: boolean) => void;
  runCommandWithHooks: (id: string, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; [k: string]: unknown }) => boolean;
  getNodeRect: (id: string) => Rect | null;
  getSelectionRect: () => Rect | null;
  onNodesChange?: (nextNodes: NodeData[], meta: ChangeMeta) => void;
}) {
  useEffect(() => {
    if (!apiRef) return;
    if (!plugins || plugins.length === 0) {
      apiRef.current = null;
      return;
    }
    apiRef.current = {
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
      subscribeCamera: (listener) => ctx.bus.on('camera:changed', ({ camera }) => listener(camera)),
      getNodes: () => ctx.getNodes(),
      exportDoc: (meta) => exportDoc({ nodes: ctx.getNodes(), camera: ctx.getCamera(), meta }),
      importDoc: (doc, opts) => {
        const next = importDoc(doc);
        // 相机先应用（immediate 可用于“无动画跳转”）
        commitCamera(next.camera, Boolean(opts?.immediate));
        if (!onNodesChange) {
          throw new Error('[InfiniteMapApi.importDoc] onNodesChange is required to apply imported nodes');
        }
        onNodesChange(next.nodes, { source: 'plugin', plugin: 'api', reason: 'import' });
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, ctx, plugins, commitCamera, runCommandWithHooks, getNodeRect, getSelectionRect, onNodesChange]);
}

