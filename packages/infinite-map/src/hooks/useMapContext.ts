import { useEffect, useMemo } from 'react';
import { querySpatialIndex } from '../core/spatialIndex';
import type { Camera, NodeData } from '../core/types';
import type { MapContext, NodePatch, Point } from '../editor/types';

export function useMapContext({
  ctxRef,
  cameraRef,
  viewportRef,
  nodesRef,
  visibleNodesRef,
  spatialIndexRef,
  screenToWorld,
  worldToScreen,
  rectScreenToWorld,
  rectWorldToScreen,
  applyPatches,
  bus,
  store,
  requestRender,
  runCommandWithHooks,
}: {
  ctxRef: React.MutableRefObject<MapContext | null>;
  cameraRef: React.MutableRefObject<Camera>;
  viewportRef: React.MutableRefObject<{ w: number; h: number }>;
  nodesRef: React.MutableRefObject<NodeData[]>;
  visibleNodesRef: React.MutableRefObject<NodeData[]>;
  spatialIndexRef: React.MutableRefObject<any>;
  screenToWorld: (p: Point) => Point;
  worldToScreen: (p: Point) => Point;
  rectScreenToWorld: (r: { x: number; y: number; w: number; h: number }) => { x: number; y: number; w: number; h: number };
  rectWorldToScreen: (r: { x: number; y: number; w: number; h: number }) => { x: number; y: number; w: number; h: number };
  applyPatches: (patches: NodePatch[], meta: any) => void;
  bus: MapContext['bus'];
  store: MapContext['store'];
  requestRender: () => void;
  runCommandWithHooks: (id: string, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; [k: string]: unknown }) => boolean;
}) {
  // 插件 ctx（稳定对象，但内部方法会读取 ref 以获得最新状态）
  const ctx: MapContext = useMemo(() => {
    const services: Record<string, unknown> = {};
    const registerService = <T,>(name: string, service: T) => {
      services[name] = service as unknown;
    };
    const getService = <T,>(name: string) => services[name] as T | undefined;
    return {
      // 通过 ref 读取最新值（不依赖 store，同步更可靠）
      getCamera: () => cameraRef.current,
      getViewport: () => viewportRef.current,
      getNodes: () => nodesRef.current,
      getVisibleNodes: () => visibleNodesRef.current,
      screenToWorld,
      worldToScreen,
      rectScreenToWorld,
      rectWorldToScreen,
      queryNodesInWorldRect: (rect) => querySpatialIndex(spatialIndexRef.current, rect),
      applyPatches,
      bus,
      store,
      services,
      registerService,
      getService,
      requestRender,
      // 提供默认命令执行入口（带 hooks）；CommandRunnerPlugin 会检测已存在则不覆盖
      runCommand: (id, payload) => {
        runCommandWithHooks(id, payload as any);
      },
    } as MapContext;
  }, [
    applyPatches,
    bus,
    cameraRef,
    viewportRef,
    nodesRef,
    visibleNodesRef,
    rectScreenToWorld,
    rectWorldToScreen,
    requestRender,
    runCommandWithHooks,
    screenToWorld,
    spatialIndexRef,
    store,
    worldToScreen,
  ]);

  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx, ctxRef]);

  return { ctx };
}
