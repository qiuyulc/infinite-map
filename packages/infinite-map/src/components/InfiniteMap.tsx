import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import type { Camera, NodeData } from '../core/types';
import { rectIntersects } from '../core/types';
import { buildSpatialIndex, querySpatialIndex } from '../core/spatialIndex';
import { computeAdaptiveSteps } from '../core/steps';
import { BackgroundDots } from './BackgroundDots';
import { BackgroundGrid } from './BackgroundGrid';
import { DefaultNode } from './DefaultNode';
import { exportDoc, importDoc, type InfiniteMapDocV1 } from '../editor/document';
import { STORE_KEYS, VISUAL_CONST } from '../editor/keys';
import { themeOverrideToCSSVars, type InfiniteMapTheme } from '../theme';
import '../theme-base.css';
import { useCamera } from '../hooks/useCamera';
import { useHighlightLayer } from '../hooks/useHighlightLayer';
// pan 已纳入 Scheme C gestures（不再使用独立 hook）
import { useViewportSize } from '../hooks/useViewportSize';
import { useVisibleNodes } from '../hooks/useVisibleNodes';
import { useWheelControls } from '../hooks/useWheelControls';
import type {
  ChangeMeta,
  Command,
  Gesture,
  HandlerResult,
  HitTestTarget,
  InfiniteMapPlugin,
  MapContext,
  MapContextMenuEvent,
  MapKeyEvent,
  MapPointerEvent,
  MapWheelEvent,
  NodePatch,
  Point,
} from '../editor/types';
import { applyPatchesToNodes, createEventBus, createStore } from '../editor/runtime';

export type InfiniteMapProps = {
  nodes: NodeData[];

  /**
   * 可选：插件系统（默认不传=纯预览）
   * - 插件数组顺序=优先级
   */
  plugins?: InfiniteMapPlugin[];

  /**
   * 变更出口（糖）：返回 nextNodes（内部由 patches 应用得到）
   * - 不传则不允许编辑类插件生效（建议）
   */
  onNodesChange?: (nextNodes: NodeData[], meta: ChangeMeta) => void;

  /**
   * 变更出口（高级）：返回 patches（适合协作/历史/性能优化）
   */
  onPatches?: (patches: NodePatch[], meta: ChangeMeta) => void;

  /** 可选：自定义节点渲染（返回一个绝对定位的内容即可） */
  renderNode?: (node: NodeData) => ReactNode;
  /**
   * 自定义节点“内容区域”（推荐）
   * - 仍然使用内置节点容器（DefaultNode 的外观/阴影/圆角等）
   * - 你的内容会被渲染在 DefaultNode 内部
   */
  renderNodeContent?: (node: NodeData) => ReactNode;
  /**
   * 自定义内置节点容器的 className/style（推荐）
   * - 只作用于 DefaultNode（不会影响定位/旋转等外层 wrapper）
   */
  getDefaultNodeProps?: (node: NodeData) => { className?: string; style?: CSSProperties };
  /**
   * 是否显示 DefaultNode 内置的 meta（例如坐标）
   * - 默认 false：组件库更干净
   */
  defaultNodeShowMeta?: boolean;
  /** 可选：节点拖动时回调（世界坐标） */
  onNodeDrag?: (id: string, pos: { x: number; y: number }, phase: 'move' | 'end') => void;
  /** 初始相机 */
  initialCamera?: Camera;

  /**
   * 命令冲突策略（当多个 plugin 提供同名 commandId）
   * - keep-first：保留第一个（默认，兼容现状）
   * - override：后者覆盖前者（更适合开放生态）
   * - error：直接抛错（开发时强约束）
   */
  commandConflictPolicy?: 'keep-first' | 'override' | 'error';
  /**
   * 命令冲突时是否打印告警（仅在 DEV 下生效）
   */
  warnOnCommandConflict?: boolean;

  /**
   * editor hooks：提供可扩展的钩子能力
   */
  /**
   * hooks 模式
   * - observe（默认）：hooks 只观察/记录，不影响执行流程
   * - intercept：允许 onBeforeCommand 返回 false 阻止执行；允许 onBeforeApplyPatches 返回 patches 覆盖
   */
  hookMode?: 'observe' | 'intercept';
  editorHooks?: {
    onBeforeCommand?: (id: string, info: { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; payload?: unknown }) => boolean | void;
    onAfterCommand?: (id: string, info: { ok: boolean; source: 'keyboard' | 'toolbar' | 'menu' | 'api'; payload?: unknown }) => void;
    onBeforeApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => NodePatch[] | void;
    onAfterApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => void;
  };

  /**
   * 全局错误上报（用于 hooks / command 执行等异常的收集）
   */
  onEditorError?: (err: unknown, info: { kind: 'hook' | 'command'; name: string; commandId?: string; source?: string }) => void;

  /** 点阵间距（世界坐标单位），可设为 'auto' 与标尺/网格同源 */
  dotSpacing?: number | 'auto';
  /** 点半径（屏幕像素，最终会随 zoom 变化不大） */
  dotRadiusPx?: number;
  /** 点基础透明度 */
  dotAlpha?: number;

  /**
   * 背景样式
   * - dots：点阵（默认）
   * - grid：网格线
   */
  backgroundMode?: 'dots' | 'grid';
  /** 网格间距（世界坐标单位），默认跟随 dotSpacing */
  gridSpacing?: number | 'auto';
  /** 网格线基础透明度 */
  gridAlpha?: number;
  /** 高亮半径（屏幕像素） */
  highlightRadiusPx?: number;
  /** wheel 时的“高亮脉冲”强度 */
  wheelPulseStrength?: number;

  /** 缩放 */
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number; // 建议 0.001~0.002
  /** 触摸板双指捏合（pinch）的缩放强度倍率（>1 更敏感，<1 更保守） */
  pinchZoomFactor?: number;

  /**
   * 虚拟化配置（推荐）
   * - enabled=false：关闭虚拟化，渲染全部节点
   * - overscanPx：视口四周额外渲染的“屏幕像素”（会自动换算成世界单位）
   * - keepAlive：对“重组件节点”（图表/视频/富文本）返回 true，避免进出视口时被卸载重建
   */
  virtualization?: {
    enabled?: boolean;
    overscanPx?: number;
    keepAlive?: (node: NodeData) => boolean;
    /**
     * pan 期间“离场节点不卸载”，避免虚拟化进出边界导致闪烁
     * - true：启用默认策略（推荐）
     * - false：禁用
     * - {maxNodes}：限制 pan 期间最多 keepAlive 的节点数量（避免长距离拖动导致集合无限增长）
     */
    panKeepAlive?: boolean | { maxNodes?: number };
  };

  /**
   * 节点虚拟化 overscan（兼容旧字段）
   * - 建议改用 virtualization.overscanPx
   */
  overscanPx?: number;
  /** 虚拟化用的空间索引格子大小（世界单位） */
  cellSize?: number;

  /** minimap 尺寸 */
  minimapWidth?: number;
  minimapHeight?: number;
  minimapCachePadding?: number;
  minimapNeedsRedraw?: unknown;

  /**
   * 主题（组件库风格）
   * - InfiniteMap 内部只消费 CSS vars（--im-*）
   * - 你可以用 InfiniteMapThemeProvider 包裹，或直接传 theme/themeBase 让 InfiniteMap 在容器上注入 vars
   */
  themeBase?: 'light' | 'dark';
  theme?: Partial<InfiniteMapTheme>;

  /**
   * 可选：对外暴露 editor API（用于自定义工具栏）
   * - 只在 plugins 存在时有效
   */
  apiRef?: MutableRefObject<InfiniteMapApi | null>;
};

export type InfiniteMapApi = {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /**
   * 订阅 history 状态变化（用于工具栏按钮 enable/disable）
   */
  subscribeHistory: (listener: () => void) => () => void;
  /**
   * 执行一个命令（用于自定义工具栏/菜单/快捷键面板）
   */
  runCommand: (id: string, payload?: { source?: 'api' | 'toolbar' | 'menu' | 'keyboard'; [k: string]: unknown }) => boolean;
  /**
   * 获取当前已注册的命令列表（由 plugins.commands 汇总）
   */
  getCommands: () => Command[];
  /**
   * 获取单个命令
   */
  getCommand: (id: string) => Command | undefined;
  /**
   * 获取当前选中的节点 id 列表
   */
  getSelectionIds: () => string[];
  /**
   * 订阅 selection 状态变化（用于 delete 按钮 enable/disable 等）
   */
  subscribeSelection: (listener: () => void) => () => void;
  /**
   * 获取/设置相机
   */
  getCamera: () => Camera;
  setCamera: (next: Camera, opts?: { immediate?: boolean }) => void;
  subscribeCamera: (listener: (camera: Camera) => void) => () => void;
  /**
   * 获取节点（只读快照）
   */
  getNodes: () => NodeData[];

  /**
   * 导出/导入持久化文档（schemaVersion + migrations）
   * - exportDoc：返回最新版本结构
   * - importDoc：解析/迁移后，用 onNodesChange + setCamera 应用到宿主
   */
  exportDoc: (meta?: Record<string, unknown>) => InfiniteMapDocV1;
  importDoc: (doc: unknown, opts?: { immediate?: boolean }) => void;
};

export function InfiniteMap({
  nodes,
  plugins,
  onNodesChange,
  onPatches,
  renderNode,
  renderNodeContent,
  getDefaultNodeProps,
  defaultNodeShowMeta = false,
  onNodeDrag,
  initialCamera = { x: -400, y: -250, zoom: 1 },
  commandConflictPolicy = 'keep-first',
  warnOnCommandConflict = true,
  editorHooks,
  hookMode = 'observe',
  onEditorError,
  dotSpacing = 48,
  dotRadiusPx = 1.35,
  dotAlpha = 0.18,
  backgroundMode = 'dots',
  gridSpacing = 'auto',
  gridAlpha = 0.14,
  highlightRadiusPx = 140,
  wheelPulseStrength = 0.55,
  minZoom = 0.25,
  maxZoom = 2.5,
  zoomSpeed = 0.0012,
  pinchZoomFactor = 0.6,
  virtualization,
  overscanPx = 900,
  cellSize = 900,
  minimapWidth = 260,
  minimapHeight = 160,
  minimapCachePadding = 120,
  minimapNeedsRedraw,
  themeBase,
  theme,
  apiRef,
}: InfiniteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { camera, cameraRef, commitCamera } = useCamera(initialCamera);
  const { viewport, viewportRef } = useViewportSize(containerRef);

  // nodes/visibleNodes refs：给插件 ctx 读取，避免闭包过期
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // 鼠标位置不需要触发 React re-render，用 ref 可避免拖动时“闪烁/卡顿”
  const mouseRef = useRef<{ x: number; y: number } | null>(null);

  // wheel 高亮“脉冲”
  const pulseRef = useRef({ value: 0, lastTs: 0 });

  // overlay 刷新（用于插件请求重绘 overlay）
  const [, bumpOverlay] = useState(0);

  // 主题变量（允许通过 props 注入；也支持外部 ThemeProvider 注入同名 --im-* 变量）
  const themeVars = useMemo(() => {
    // 若宿主没有显式传入，则不注入，交给外部 CSS vars / Provider 控制
    // 新策略：
    // - base(light/dark) 由 theme-base.css 提供，通过 data-im-theme 切换
    // - 这里只注入 override（大幅减少 inline vars 数量）
    if (!theme) return undefined;
    return themeOverrideToCSSVars(theme) as unknown as CSSProperties;
  }, [theme]);

  // visibleNodes ref（给插件读取）
  const visibleNodesRef = useRef<NodeData[]>([]);

  // 空间索引（给插件查询）
  const spatialIndex = useMemo(() => buildSpatialIndex(nodes, cellSize), [nodes, cellSize]);
  const spatialIndexRef = useRef(spatialIndex);
  useEffect(() => {
    spatialIndexRef.current = spatialIndex;
  }, [spatialIndex]);

  const screenToWorld = useCallback(
    (p: Point) => {
      const z = cameraRef.current.zoom || 1;
      return { x: cameraRef.current.x + p.x / z, y: cameraRef.current.y + p.y / z };
    },
    [cameraRef]
  );

  const worldToScreen = useCallback(
    (p: Point) => {
      const cam = cameraRef.current;
      const z = cam.zoom || 1;
      return { x: (p.x - cam.x) * z, y: (p.y - cam.y) * z };
    },
    [cameraRef]
  );

  const rectScreenToWorld = useCallback(
    (r: { x: number; y: number; w: number; h: number }) => {
      const p0 = screenToWorld({ x: r.x, y: r.y });
      const p1 = screenToWorld({ x: r.x + r.w, y: r.y + r.h });
      return { x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y };
    },
    [screenToWorld]
  );

  const rectWorldToScreen = useCallback(
    (r: { x: number; y: number; w: number; h: number }) => {
      const p0 = worldToScreen({ x: r.x, y: r.y });
      const p1 = worldToScreen({ x: r.x + r.w, y: r.y + r.h });
      return { x: p0.x, y: p0.y, w: p1.x - p0.x, h: p1.y - p0.y };
    },
    [worldToScreen]
  );

  // 插件 bus/store（稳定引用）
  const bus = useMemo(() => createEventBus(), []);
  const store = useMemo(() => createStore(), []);

  const hooksRef = useRef(editorHooks);
  useEffect(() => {
    hooksRef.current = editorHooks;
  }, [editorHooks]);

  const hookModeRef = useRef(hookMode);
  useEffect(() => {
    hookModeRef.current = hookMode;
  }, [hookMode]);

  const onEditorErrorRef = useRef(onEditorError);
  useEffect(() => {
    onEditorErrorRef.current = onEditorError;
  }, [onEditorError]);

  // 重要：onNodesChange/onPatches 可能在宿主每次 render 时都是新函数引用
  // 如果直接放在 applyPatches 的依赖里，会导致 ctx 变化，从而触发 plugins.setup 反复执行（例如 toolbar/menu registry 被重复注入）
  const onNodesChangeRef = useRef(onNodesChange);
  useEffect(() => {
    onNodesChangeRef.current = onNodesChange;
  }, [onNodesChange]);

  const onPatchesRef = useRef(onPatches);
  useEffect(() => {
    onPatchesRef.current = onPatches;
  }, [onPatches]);

  // ctx 引用：供 runCommandWithHooks 在任意时刻拿到最新 ctx
  const ctxRef = useRef<MapContext | null>(null);

  // move-phase patches 节流：拖拽/缩放/旋转期间把高频 patch 合并到 rAF，避免频繁 setState 导致卡顿/闪烁
  const pendingMoveRafRef = useRef<number | null>(null);
  const pendingMovePatchesRef = useRef<NodePatch[] | null>(null);
  const pendingMoveMetaRef = useRef<ChangeMeta | null>(null);

  // Scheme C：指针手势状态（全局互斥）
  const gestureStateRef = useRef<{
    active: null | { pointerId: number; gesture: Gesture; hit: HitTestTarget };
  }>({ active: null });

  // Scheme C：hover 命中（仅当没有 active gesture 时更新）
  const hoverRef = useRef<HitTestTarget>({ kind: 'blank' });

  const sameHit = (a: HitTestTarget, b: HitTestTarget) => {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'blank') return true;
    if (a.kind === 'node') return a.id === (b as any).id;
    return a.owner === (b as any).owner && a.id === (b as any).id && a.handle === (b as any).handle;
  };

  const cursorFromHit = (hit: HitTestTarget) => {
    // Space 平移模式优先
    if (store.get<boolean>(STORE_KEYS.keyboardSpace)) return 'grab';
    if (typeof hit.cursor === 'string' && hit.cursor) return hit.cursor;
    if (hit.kind === 'node') return 'grab';
    if (hit.kind === 'handle' && hit.owner === 'resize') {
      const h = hit.handle;
      if (h === 'n' || h === 's') return 'ns-resize';
      if (h === 'e' || h === 'w') return 'ew-resize';
      if (h === 'ne' || h === 'sw') return 'nesw-resize';
      if (h === 'nw' || h === 'se') return 'nwse-resize';
      return 'nwse-resize';
    }
    if (hit.kind === 'handle' && hit.owner === 'rotate') return 'grab';
    return 'default';
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
  }, [bus]);

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
    [bus, flushPendingMovePatches]
  );

  const runCommandWithHooks = useCallback(
    (id: string, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; [k: string]: unknown }) => {
      const ctx0 = ctxRef.current;
      if (!ctx0) return false;
      const source = (payload?.source ?? 'api') as 'keyboard' | 'toolbar' | 'menu' | 'api';

      const before = hooksRef.current?.onBeforeCommand;
      if (before) {
        try {
          const ok = before(id, { source, payload });
          if (hookModeRef.current === 'intercept' && ok === false) return false;
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onBeforeCommand', commandId: id, source });
        }
      }

      const reg = ctx0.store.get<Record<string, Command>>('commands:registry') ?? {};
      const cmd = reg[id];
      if (!cmd) {
        try {
          hooksRef.current?.onAfterCommand?.(id, { ok: false, source, payload });
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onAfterCommand', commandId: id, source });
        }
        return false;
      }
      try {
        cmd.run(ctx0, { source });
        try {
          hooksRef.current?.onAfterCommand?.(id, { ok: true, source, payload });
        } catch (err) {
          onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onAfterCommand', commandId: id, source });
        }
        return true;
      } catch (err) {
        onEditorErrorRef.current?.(err, { kind: 'command', name: 'run', commandId: id, source });
        try {
          hooksRef.current?.onAfterCommand?.(id, { ok: false, source, payload });
        } catch (e2) {
          onEditorErrorRef.current?.(e2, { kind: 'hook', name: 'onAfterCommand', commandId: id, source });
        }
        return false;
      }
    },
    []
  );

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
      queryNodesInWorldRect: (rect) => {
        return querySpatialIndex(spatialIndexRef.current, rect);
      },
      applyPatches,
      bus,
      store,
      services,
      registerService,
      getService,
      requestRender: () => bumpOverlay((v) => v + 1),
      // 提供默认命令执行入口（带 hooks）；CommandRunnerPlugin 会检测已存在则不覆盖
      runCommand: (id, payload) => {
        runCommandWithHooks(id, payload as unknown as { source: 'keyboard' | 'toolbar' | 'menu' | 'api' });
      },
    } as MapContext;
  }, [
    applyPatches,
    bus,
    cameraRef,
    rectScreenToWorld,
    rectWorldToScreen,
    runCommandWithHooks,
    screenToWorld,
    store,
    viewportRef,
    worldToScreen,
  ]);

  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  // 对外暴露 hover service（overlay 可读取当前命中，用于 hover 高亮等）
  useEffect(() => {
    ctx.registerService('hover', {
      get: () => hoverRef.current,
    });
  }, [ctx]);

  // 把视图配置（min/max zoom）暴露给插件（如 ViewCommandsPlugin）
  useEffect(() => {
    ctx.store.set(STORE_KEYS.viewConfig, { minZoom, maxZoom, zoomStep: 1.2, paddingPx: 48 });
  }, [ctx, maxZoom, minZoom]);

  // commands registry：将 plugins.commands 汇总到 store，供 CommandRunnerPlugin 使用
  useEffect(() => {
    if (!plugins || plugins.length === 0) {
      store.set('commands:registry', {});
      return;
    }
    const registry: Record<string, Command> = {};
    const from: Record<string, string> = {};
    for (const p of plugins) {
      if (p.enabled === false) continue;
      const cmds = p.commands ?? {};
      for (const [id, cmd] of Object.entries(cmds)) {
        if (!registry[id]) {
          registry[id] = cmd;
          from[id] = p.id;
          continue;
        }
        // 冲突处理
        const prevPlugin = from[id] ?? 'unknown';
        const nextPlugin = p.id;
        const msg = `[InfiniteMap] command 冲突：${id} 来自 ${prevPlugin} 与 ${nextPlugin}`;
        // 作为三方库：不要依赖 Vite 的 import.meta.env 类型；也避免直接引用全局 process（浏览器/tsconfig 可能没 node types）
        const nodeEnv = (globalThis as any)?.process?.env?.NODE_ENV as string | undefined;
        const isDev = nodeEnv != null ? nodeEnv !== 'production' : false;
        const shouldWarn = Boolean(warnOnCommandConflict) && isDev;
        if (commandConflictPolicy === 'error') {
          if (shouldWarn) console.error(msg);
          throw new Error(msg);
        }
        if (commandConflictPolicy === 'override') {
          if (shouldWarn) console.warn(msg + '（已覆盖）');
          registry[id] = cmd;
          from[id] = nextPlugin;
        } else {
          if (shouldWarn) console.warn(msg + '（已忽略）');
          // keep-first：忽略后者
        }
      }
    }
    store.set('commands:registry', registry);
  }, [plugins, store, commandConflictPolicy, warnOnCommandConflict]);

  // camera state 更新：广播 changed 事件（用于外部订阅）
  useEffect(() => {
    bus.emit('camera:changed', { camera });
  }, [bus, camera]);

  // 对外 API（供工具栏使用）
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
      getSelectionIds: () => ctx.getService<{ getIds: () => string[] }>('selection')?.getIds?.() ?? [],
      subscribeSelection: (listener) => ctx.bus.on('selection:change', listener),
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
  }, [apiRef, ctx, plugins, commitCamera, runCommandWithHooks]);

  // 插件 setup/teardown（Milestone 1：只提供生命周期，不引入任何默认插件）
  useEffect(() => {
    if (!plugins || plugins.length === 0) return;
    plugins.forEach((p) => {
      if (p.enabled === false) return;
      p.setup?.(ctx);
    });
    return () => {
      plugins.forEach((p) => {
        if (p.enabled === false) return;
        p.teardown?.();
      });
    };
  }, [plugins, ctx]);

  // Scheme C：pan 手势状态
  const panRef = useRef<null | { pointerId: number; startScreen: { x: number; y: number }; startCam: { x: number; y: number } }>(null);

  useWheelControls({
    containerRef,
    mouseRef,
    pulseRef,
    cameraRef,
    commitCamera,
    minZoom,
    maxZoom,
    zoomSpeed,
    pinchZoomFactor,
    onWheelIntercept: (e, info) => {
      if (!plugins || plugins.length === 0) return undefined;
      const m: MapWheelEvent = {
        screen: { x: info.sx, y: info.sy },
        world: screenToWorld({ x: info.sx, y: info.sy }),
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        ctrlKey: e.ctrlKey === true,
        modifiers: { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey },
        originalEvent: e,
      };
      let sawContinue = false;
      for (const p of plugins) {
        if (p.enabled === false) continue;
        const res = p.input?.onWheel?.(m, ctx);
        if (!res || res.handled === false) continue;
        if (res.mode === 'continue') {
          sawContinue = true;
          continue;
        }
        return 'stop';
      }
      return sawContinue ? 'continue' : undefined;
    },
  });

  useHighlightLayer({
    canvasRef: highlightCanvasRef,
    viewport,
    viewportRef,
    cameraRef,
    mouseRef,
    pulseRef,
    dotSpacing: dotSpacing === 'auto' ? computeAdaptiveSteps(camera.zoom).minorStepWorld : dotSpacing,
    dotRadiusPx,
    highlightRadiusPx,
    wheelPulseStrength,
  });

  const virtualizationEnabled = virtualization?.enabled ?? true;
  const virtualizationOverscanPx = virtualization?.overscanPx ?? overscanPx;
  const keepAlive = virtualization?.keepAlive;

  // panning 时防止“可见节点进出边界导致卸载/重建”造成闪烁：
  // - pan 期间：允许“新进入视口的节点”正常 mount
  // - 但“离开视口的节点”在 pan 结束前不卸载（保持稳定）
  const [panActive, setPanActive] = useState(false);
  const panKeepAliveEnabled = (virtualization?.panKeepAlive ?? true) !== false;
  const panKeepAliveMaxNodes =
    typeof virtualization?.panKeepAlive === 'object' ? virtualization.panKeepAlive.maxNodes ?? 2000 : 2000;
  // 用稳定引用的 Set/Map 存储（避免把 Set 换引用导致 hooks 依赖混乱）
  const panKeepAliveIdSetRef = useRef<Set<string>>(new Set());
  const panKeepAliveLRURef = useRef<Map<string, number>>(new Map());

  const panKeepAliveAdd = useCallback(
    (ids: Iterable<string>) => {
      const set = panKeepAliveIdSetRef.current;
      const lru = panKeepAliveLRURef.current;
      for (const id of ids) {
        set.add(id);
        // LRU：通过 delete+set 把该 key 移到末尾
        if (lru.has(id)) lru.delete(id);
        lru.set(id, Date.now());
      }
      // 超限：移除最旧的
      while (lru.size > panKeepAliveMaxNodes) {
        const first = lru.keys().next().value as string | undefined;
        if (!first) break;
        lru.delete(first);
        set.delete(first);
      }
    },
    [panKeepAliveMaxNodes]
  );

  const { visibleNodes } = useVisibleNodes({
    nodes,
    cellSize,
    camera,
    viewport,
    overscanPx: virtualizationOverscanPx,
    enabled: virtualizationEnabled,
    keepAlive,
    keepAliveIdSet: panActive && panKeepAliveEnabled ? panKeepAliveIdSetRef.current : undefined,
  });

  // pan 期间：不断把“当前可见节点”加入 keepAlive 集合（允许 new nodes mount，old nodes 暂不卸载）
  useEffect(() => {
    if (!panActive || !panKeepAliveEnabled) return;
    panKeepAliveAdd(visibleNodes.map((n) => n.id));
  }, [panActive, panKeepAliveAdd, panKeepAliveEnabled, visibleNodes]);

  useEffect(() => {
    visibleNodesRef.current = visibleNodes;
  }, [visibleNodes]);

  // 严格 “in view”：不包含 overscan，用于 UI 展示当前屏幕内真正可见的节点数量
  const inViewCount = useMemo(() => {
    if (visibleNodes.length === 0) return 0;
    if (viewport.w <= 0 || viewport.h <= 0) return 0;
    const z = camera.zoom || 1;
    const viewWorldRect = {
      x: camera.x,
      y: camera.y,
      w: viewport.w / z,
      h: viewport.h / z,
    };
    let count = 0;
    for (const n of visibleNodes) if (rectIntersects(viewWorldRect, { x: n.x, y: n.y, w: n.width, h: n.height })) count++;
    return count;
  }, [camera.x, camera.y, camera.zoom, visibleNodes, viewport.h, viewport.w]);

  // 给插件提供严格 inViewCount（用于“可视区域内只有 1 个节点”的判断）
  useEffect(() => {
    store.set(STORE_KEYS.minimapInViewCount, inViewCount);
  }, [inViewCount, store]);

  // minimap config（供 minimap plugin 读取）
  useEffect(() => {
    store.set(STORE_KEYS.minimapConfig, { width: minimapWidth, height: minimapHeight, cachePadding: minimapCachePadding });
    store.set(STORE_KEYS.minimapNeedsRedraw, minimapNeedsRedraw);
  }, [minimapCachePadding, minimapHeight, minimapNeedsRedraw, minimapWidth, store]);

  // camera 变更事件：允许插件（如 minimap）驱动相机
  useEffect(() => {
    return bus.on('camera:change', ({ camera: next, immediate }) => {
      commitCamera(next, immediate);
    });
  }, [bus, commitCamera]);

  const dispatchPointer = useCallback(
    (type: MapPointerEvent['type'], e: ReactPointerEvent): HandlerResult => {
      if (!plugins || plugins.length === 0) return { handled: false };
      const el = containerRef.current;
      if (!el) return { handled: false };
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      // 无论是否被手势接管，都更新鼠标位置（highlight layer 会用）
      mouseRef.current = { x: sx, y: sy };
      const m: MapPointerEvent = {
        type,
        pointerId: e.pointerId,
        button: e.button,
        buttons: e.buttons,
        screen: { x: sx, y: sy },
        world: screenToWorld({ x: sx, y: sy }),
        modifiers: { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey },
        originalEvent: e,
      };

      // ---- Scheme C: hitTest + gesture manager ----
      const enabledPlugins = plugins.filter((p) => p.enabled !== false);
      const hooks = enabledPlugins.map((p) => p.inputHooks).filter(Boolean) as Array<NonNullable<InfiniteMapPlugin['inputHooks']>>;
      const hitTests = enabledPlugins
        .flatMap((p) => p.hitTests ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const processors = enabledPlugins
        .flatMap((p) => p.pointerDownProcessors ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const gestures = enabledPlugins
        .flatMap((p) => p.gestures ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      // 内置 pan gesture（最低优先级兜底）
      gestures.push({
        id: 'pan',
        priority: -9999,
        canStart: (e: MapPointerEvent, ctx: MapContext, hit: HitTestTarget) => {
          if (e.button !== 0) return false;
          // Space：全局平移模式（无视命中）
          if (ctx.store.get<boolean>(STORE_KEYS.keyboardSpace)) return true;
          // 空白拖动平移
          return hit.kind === 'blank';
        },
        onStart: (e: MapPointerEvent, ctx: MapContext) => {
          panRef.current = {
            pointerId: e.pointerId,
            startScreen: { ...e.screen },
            startCam: { x: ctx.getCamera().x, y: ctx.getCamera().y },
          };
          if (!panActive && panKeepAliveEnabled) {
            // seed：把手势开始时可见的节点加入 keepAlive
            panKeepAliveIdSetRef.current.clear();
            panKeepAliveLRURef.current.clear();
            panKeepAliveAdd(visibleNodesRef.current.map((n) => n.id));
          }
          if (!panActive) setPanActive(true);
        },
        onMove: (e: MapPointerEvent, ctx: MapContext) => {
          const st = panRef.current;
          if (!st || st.pointerId !== e.pointerId) return;
          const cam = ctx.getCamera();
          const dx = e.screen.x - st.startScreen.x;
          const dy = e.screen.y - st.startScreen.y;
          commitCamera({ x: st.startCam.x - dx / cam.zoom, y: st.startCam.y - dy / cam.zoom, zoom: cam.zoom }, false);
        },
        onEnd: (e: MapPointerEvent) => {
          const st = panRef.current;
          if (st?.pointerId === e.pointerId) panRef.current = null;
          if (panActive) {
            setPanActive(false);
            panKeepAliveIdSetRef.current.clear();
            panKeepAliveLRURef.current.clear();
          }
        },
        onCancel: (e: MapPointerEvent) => {
          const st = panRef.current;
          if (st?.pointerId === e.pointerId) panRef.current = null;
          if (panActive) {
            setPanActive(false);
            panKeepAliveIdSetRef.current.clear();
            panKeepAliveLRURef.current.clear();
          }
        },
      } satisfies Gesture);

      // active gesture state
      const st = (gestureStateRef.current ??= { active: null });

      const callHooks = <K extends keyof NonNullable<InfiniteMapPlugin['inputHooks']>>(
        key: K,
        ...args: Parameters<NonNullable<NonNullable<InfiniteMapPlugin['inputHooks']>[K]>>
      ) => {
        for (const h of hooks) {
          const fn = h?.[key] as any;
          if (!fn) continue;
          try {
            fn(...args);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'hook', name: String(key) });
          }
        }
      };

      const runHitTest = (info: { kind: 'pointer' | 'contextmenu' }) => {
        callHooks('onBeforeHitTest', m, ctx, info);
        let hit: HitTestTarget = { kind: 'blank' };
        for (const ht of hitTests) {
          const r = ht.hitTest(m, ctx, info);
          if (r) {
            hit = r;
            break;
          }
        }
        callHooks('onAfterHitTest', hit, m, ctx, info);
        return hit;
      };

      if (type === 'down') {
        let hit = runHitTest({ kind: 'pointer' });

        // pointer down processors（selection 等）
        let blockGesture = false;
        for (const pr of processors) {
          try {
            const r = pr.onPointerDown(m, ctx, hit);
            if (r && (r as any).stop === true) blockGesture = true;
            if (r && (r as any).hit) hit = (r as any).hit as HitTestTarget;
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'hook', name: `processor.onPointerDown:${pr.id}` });
          }
        }
        if (blockGesture) return { handled: true, mode: 'stop' };

        // 选择一个 gesture 启动
        for (const g of gestures) {
          let ok = false;
          try {
            ok = g.canStart(m, ctx, hit);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'hook', name: `gesture.canStart:${g.id}` });
          }
          if (!ok) continue;
          st.active = { pointerId: m.pointerId, gesture: g, hit };
          callHooks('onBeforeGesture', { phase: 'start', gestureId: g.id, hit, e: m }, ctx);
          try {
            g.onStart(m, ctx, hit);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'command', name: `gesture.onStart:${g.id}` });
          }
          callHooks('onAfterGesture', { phase: 'start', gestureId: g.id, hit, e: m }, ctx);
          return { handled: true, mode: 'stop' };
        }
        return { handled: false };
      }

      // move/up/cancel：仅派发给 active gesture
      const active = st.active;
      if (!active || active.pointerId !== m.pointerId) {
        // hover/cursor：仅在 move 且没有 active gesture 时运行
        if (type === 'move') {
          const hit = runHitTest({ kind: 'pointer' });
          const prev = hoverRef.current;
          if (!sameHit(prev, hit)) {
            hoverRef.current = hit;
            store.set(STORE_KEYS.hoverHit, hit);
            ctx.bus.emit('hover:change', { prev, next: hit });
            for (const h of hooks) {
              const fn = h?.onHoverChange;
              if (!fn) continue;
              try {
                fn({ prev, next: hit, e: m }, ctx);
              } catch (err) {
                onEditorErrorRef.current?.(err, { kind: 'hook', name: 'onHoverChange' });
              }
            }
          }
          const c = cursorFromHit(hit);
          if (containerRef.current && containerRef.current.style.cursor !== c) containerRef.current.style.cursor = c;
        }
        return { handled: false };
      }
      const g = active.gesture;
      const phase = type === 'move' ? 'move' : type === 'up' ? 'end' : 'cancel';
      callHooks('onBeforeGesture', { phase, gestureId: g.id, hit: active.hit, e: m }, ctx);
      try {
        if (phase === 'move') g.onMove(m, ctx);
        else if (phase === 'end') g.onEnd(m, ctx);
        else g.onCancel(m, ctx);
      } catch (err) {
        onEditorErrorRef.current?.(err, { kind: 'command', name: `gesture.${phase}:${g.id}` });
      }
      callHooks('onAfterGesture', { phase, gestureId: g.id, hit: active.hit, e: m }, ctx);
      if (phase !== 'move') st.active = null;
      return { handled: true, mode: 'stop' };
    },
    [plugins, ctx, screenToWorld, panActive, panKeepAliveEnabled, panKeepAliveAdd, commitCamera]
  );

  const dispatchContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!plugins || plugins.length === 0) return { handled: false } as HandlerResult;
      const el = containerRef.current;
      if (!el) return { handled: false } as HandlerResult;
      const r = el.getBoundingClientRect();
      const m: MapContextMenuEvent = {
        screen: { x: e.clientX, y: e.clientY },
        // world 需要使用相对画布的 screen 坐标
        world: screenToWorld({ x: e.clientX - r.left, y: e.clientY - r.top }),
        modifiers: { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey },
        originalEvent: e.nativeEvent,
      };
      const enabledPlugins = plugins.filter((p) => p.enabled !== false);
      const hooks = enabledPlugins.map((p) => p.inputHooks).filter(Boolean) as Array<NonNullable<InfiniteMapPlugin['inputHooks']>>;
      const hitTests = enabledPlugins
        .flatMap((p) => p.hitTests ?? [])
        .slice()
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const callHooks = <K extends keyof NonNullable<InfiniteMapPlugin['inputHooks']>>(
        key: K,
        ...args: Parameters<NonNullable<NonNullable<InfiniteMapPlugin['inputHooks']>[K]>>
      ) => {
        for (const h of hooks) {
          const fn = h?.[key] as any;
          if (!fn) continue;
          try {
            fn(...args);
          } catch (err) {
            onEditorErrorRef.current?.(err, { kind: 'hook', name: String(key) });
          }
        }
      };
      callHooks('onBeforeHitTest', m, ctx, { kind: 'contextmenu' });
      let hit: HitTestTarget = { kind: 'blank' };
      for (const ht of hitTests) {
        const r = ht.hitTest(m, ctx, { kind: 'contextmenu' });
        if (r) {
          hit = r;
          break;
        }
      }
      callHooks('onAfterHitTest', hit, m, ctx, { kind: 'contextmenu' });

      let sawContinue = false;
      for (const p of enabledPlugins) {
        const res = p.input?.onContextMenu?.(m, ctx, hit);
        if (!res || res.handled === false) continue;
        if (res.mode === 'continue') {
          sawContinue = true;
          continue;
        }
        return { handled: true, mode: 'stop' } as HandlerResult;
      }
      return sawContinue ? ({ handled: true, mode: 'continue' } as HandlerResult) : ({ handled: false } as HandlerResult);
    },
    [plugins, ctx, screenToWorld]
  );

  // key 事件（仅当插件存在时监听）
  useEffect(() => {
    if (!plugins || plugins.length === 0) return;

    const toModifiers = (e: KeyboardEvent) => ({ shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey, meta: e.metaKey });
    const dispatchKey = (type: MapKeyEvent['type'], e: KeyboardEvent) => {
      const m: MapKeyEvent = {
        type,
        key: e.key,
        code: e.code,
        modifiers: toModifiers(e),
        originalEvent: e,
      };
      let sawContinue = false;
      for (const p of plugins) {
        if (p.enabled === false) continue;
        const res =
          type === 'down' ? p.input?.onKeyDown?.(m, ctx) : p.input?.onKeyUp?.(m, ctx);
        if (!res || res.handled === false) continue;
        if (res.mode === 'continue') {
          sawContinue = true;
          continue;
        }
        e.preventDefault();
        return;
      }
      if (sawContinue) {
        // 默认不 preventDefault
      }
    };

    const onDown = (e: KeyboardEvent) => dispatchKey('down', e);
    const onUp = (e: KeyboardEvent) => dispatchKey('up', e);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [plugins, ctx]);

  const dragRef = useRef<{
    active: boolean;
    id: string;
    startPx: number;
    startPy: number;
    startX: number;
    startY: number;
  } | null>(null);


  const onNodePointerDown = useCallback(
    (e: ReactPointerEvent, n: NodeData) => {
      if (!onNodeDrag) return;
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        active: true,
        id: n.id,
        startPx: e.clientX,
        startPy: e.clientY,
        startX: n.x,
        startY: n.y,
      };
    },
    [onNodeDrag]
  );

  const onNodePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d?.active || !onNodeDrag) return;
      e.stopPropagation();
      if ((e.buttons & 1) === 0) return;
      const zoom = cameraRef.current.zoom || 1;
      const dx = (e.clientX - d.startPx) / zoom;
      const dy = (e.clientY - d.startPy) / zoom;
      onNodeDrag(d.id, { x: d.startX + dx, y: d.startY + dy }, 'move');
    },
    [onNodeDrag, cameraRef]
  );

  const endDrag = useCallback(
    (e: ReactPointerEvent) => {
      const d = dragRef.current;
      if (!d?.active || !onNodeDrag) return;
      e.stopPropagation();
      d.active = false;
      const zoom = cameraRef.current.zoom || 1;
      const dx = (e.clientX - d.startPx) / zoom;
      const dy = (e.clientY - d.startPy) / zoom;
      onNodeDrag(d.id, { x: d.startX + dx, y: d.startY + dy }, 'end');
      dragRef.current = null;
    },
    [onNodeDrag, cameraRef]
  );

  // DOM 模式下：把节点 elements 记忆化，避免每次 camera 更新都创建/比对几百个子元素导致卡顿
  const domNodeElements = useMemo(() => {
    return visibleNodes.map((n) => (
      <div
        key={n.id}
        style={{
          position: 'absolute',
          left: n.x,
          top: n.y,
          width: n.width,
          height: n.height,
          transformOrigin: '50% 50%',
          transform:
            n.rotation || n.rotationX || n.rotationY
              ? `perspective(${VISUAL_CONST.perspectivePx}px) rotateX(${n.rotationX ?? 0}deg) rotateY(${n.rotationY ?? 0}deg) rotate(${n.rotation ?? 0}deg)`
              : undefined,
          // 隔离布局/样式，保留阴影等外溢绘制（避免 paint containment 裁剪 box-shadow）
          contain: 'layout style',
          touchAction: 'none',
          cursor: onNodeDrag ? 'grab' : 'default',
        }}
        onPointerDown={onNodeDrag ? (e) => onNodePointerDown(e, n) : undefined}
        onPointerMove={onNodeDrag ? onNodePointerMove : undefined}
        onPointerUp={onNodeDrag ? endDrag : undefined}
        onPointerCancel={onNodeDrag ? endDrag : undefined}
      >
        {renderNode ? (
          renderNode(n)
        ) : (
          <DefaultNode
            n={n}
            className={getDefaultNodeProps?.(n)?.className}
            style={getDefaultNodeProps?.(n)?.style}
            showMeta={defaultNodeShowMeta}
          >
            {renderNodeContent ? renderNodeContent(n) : null}
          </DefaultNode>
        )}
      </div>
    ));
  }, [
    visibleNodes,
    renderNode,
    renderNodeContent,
    getDefaultNodeProps,
    defaultNodeShowMeta,
    onNodeDrag,
    onNodePointerDown,
    onNodePointerMove,
    endDrag,
  ]);

  const worldStyle: CSSProperties = useMemo(() => {
    // translate(-camera.x * zoom, -camera.y * zoom) scale(zoom)
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      transformOrigin: '0 0',
      transform: `translate3d(${-camera.x * camera.zoom}px, ${-camera.y * camera.zoom}px, 0) scale(${camera.zoom})`,
      willChange: 'transform',
      width: 0,
      height: 0,
    };
  }, [camera.x, camera.y, camera.zoom]);

  return (
    <div
      ref={containerRef}
      data-im-theme={themeBase ?? 'light'}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        // 注入 --im-* 主题变量（也支持外部 ThemeProvider 注入同名变量）
        ...(themeVars ?? {}),
        background: 'var(--im-map-bg, var(--map-bg))',
        borderRadius: 0,
        border: 'none',
        transition: 'background-color 220ms ease, border-color 220ms ease',
        touchAction: 'none',
      }}
      /**
       * 重要：插件事件分发使用 capture 阶段，确保即使子元素（例如节点拖拽）stopPropagation，
       * 也能收到点击/拖拽等事件（SelectionPlugin 需要）。
       */
      onPointerDownCapture={(e) => {
        // 组件库的 UI（toolbar/menu 等）不应被“画布插件”拦截
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchPointer('down', e);
        if (res.handled === true && res.mode !== 'continue') {
          // 关键：在 overlay handle（resize）这种“很小的命中区域”下，
          // 如果不 capture 指针，快速拖动时 move/up 可能丢给别的元素，导致缩放中断或变成框选。
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerMoveCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchPointer('move', e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerUpCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchPointer('up', e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerCancelCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchPointer('cancel', e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onContextMenuCapture={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        const res = dispatchContextMenu(e);
        if (res.handled === true && res.mode !== 'continue') {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      onPointerLeave={(e: ReactPointerEvent) => {
        // leave：清理 hover + 鼠标位置，并 cancel 当前 active gesture（包括 pan）
        mouseRef.current = null;
        hoverRef.current = { kind: 'blank' };
        store.set(STORE_KEYS.hoverHit, { kind: 'blank' });
        if (containerRef.current) containerRef.current.style.cursor = 'default';
        dispatchPointer('cancel', e);
      }}
    >
      {/* 插件 background 层（在节点层之下） */}
      {plugins && plugins.length > 0 ? (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {plugins
            .filter((p) => p.enabled !== false && p.slot === 'background')
            .map((p) => {
              const Overlay = p.overlay;
              return (
                <div key={p.id} data-plugin={p.id} style={{ pointerEvents: p.overlayPointerEvents ?? 'none' }}>
                  {Overlay ? <Overlay ctx={ctx} /> : null}
                </div>
              );
            })}
        </div>
      ) : null}

      {backgroundMode === 'grid' ? (
        <BackgroundGrid
          camera={camera}
          gridSpacing={gridSpacing === 'auto' ? 'auto' : gridSpacing ?? dotSpacing}
          gridAlpha={gridAlpha}
        />
      ) : (
        <BackgroundDots camera={camera} dotSpacing={dotSpacing} dotRadiusPx={dotRadiusPx} dotAlpha={dotAlpha} />
      )}

      {/* 高亮点层（Canvas，只画鼠标附近） */}
      <canvas
        ref={highlightCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* 节点层：DOM 渲染（暂时不启用 Canvas 模式） */}
      <div style={{ ...worldStyle, zIndex: 1 }}>{domNodeElements}</div>

      {/* 插件 overlay 层（guides / marquee / selection 等，默认插槽） */}
      {plugins && plugins.length > 0 ? (
        // 重要：父层用 pointerEvents:none，避免“透明大层”成为事件 target，导致点不到 resize/rotate handle
        // 需要交互的 overlay 由各插件 wrapper 自己设置 overlayPointerEvents: 'auto'
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
          {plugins
            .filter((p) => p.enabled !== false && (p.slot === undefined || p.slot === 'overlay'))
            .map((p) => {
              const Overlay = p.overlay;
              return (
                <div key={p.id} data-plugin={p.id} style={{ pointerEvents: p.overlayPointerEvents ?? 'none' }}>
                  {Overlay ? <Overlay ctx={ctx} /> : null}
                </div>
              );
            })}
        </div>
      ) : null}

      {/* 插件 hud 层（minimap/标尺/面板等，通常最上层） */}
      {plugins && plugins.length > 0 ? (
        // 同 overlay：父层不拦截事件，交互由各 hud 插件自己控制
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
          {plugins
            .filter((p) => p.enabled !== false && p.slot === 'hud')
            .map((p) => {
              const Overlay = p.overlay;
              return (
                <div key={p.id} data-plugin={p.id} style={{ pointerEvents: p.overlayPointerEvents ?? 'none' }}>
                  {Overlay ? <Overlay ctx={ctx} /> : null}
                </div>
              );
            })}
        </div>
      ) : null}

    </div>
  );
}
