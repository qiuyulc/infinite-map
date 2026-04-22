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
import { STORE_KEYS, VISUAL_CONST } from '../editor/keys';
import { darkTheme, lightTheme, mergeTheme, themeToCSSVars, type InfiniteMapTheme } from '../theme';
import { useCamera } from '../hooks/useCamera';
import { useHighlightLayer } from '../hooks/useHighlightLayer';
import { usePointerPan } from '../hooks/usePointerPan';
import { useViewportSize } from '../hooks/useViewportSize';
import { useVisibleNodes } from '../hooks/useVisibleNodes';
import { useWheelControls } from '../hooks/useWheelControls';
import type {
  ChangeMeta,
  Command,
  HandlerResult,
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
  editorHooks?: {
    onBeforeCommand?: (id: string, info: { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; payload?: unknown }) => boolean | void;
    onAfterCommand?: (id: string, info: { ok: boolean; source: 'keyboard' | 'toolbar' | 'menu' | 'api'; payload?: unknown }) => void;
    onBeforeApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => NodePatch[] | void;
    onAfterApplyPatches?: (patches: NodePatch[], meta: ChangeMeta) => void;
  };

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
   * 节点虚拟化：视口四周额外渲染的“屏幕像素”（会自动换算成世界单位）
   * 这样缩放时边缘不会因为 overscan 变小而频繁进出导致闪烁。
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
    if (!theme && !themeBase) return undefined;
    const base = (themeBase ?? 'light') === 'dark' ? darkTheme : lightTheme;
    return themeToCSSVars(mergeTheme(base, theme)) as unknown as CSSProperties;
  }, [theme, themeBase]);

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

  // ctx 引用：供 runCommandWithHooks 在任意时刻拿到最新 ctx
  const ctxRef = useRef<MapContext | null>(null);

  const applyPatches = useCallback(
    (patches: NodePatch[], meta: ChangeMeta) => {
      if (!patches || patches.length === 0) return;

      const hook = hooksRef.current?.onBeforeApplyPatches;
      const nextPatches = hook ? hook(patches, meta) : undefined;
      const usePatches = Array.isArray(nextPatches) ? nextPatches : patches;
      if (!usePatches || usePatches.length === 0) return;
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
      onPatches?.(usePatches, meta);
      if (onNodesChange) {
        // 关键：同步更新 nodesRef，避免短时间内连续 applyPatches（例如快速 undo/redo）
        // 仍然基于旧 nodesRef 计算，导致后续操作一直在“旧快照”上叠加从而界面不更新。
        const next = applyPatchesToNodes(nodesRef.current, usePatches);
        nodesRef.current = next;
        onNodesChange(next, meta);
      }
      hooksRef.current?.onAfterApplyPatches?.(usePatches, meta);
    },
    [bus, onNodesChange, onPatches]
  );

  const runCommandWithHooks = useCallback(
    (id: string, payload?: { source: 'keyboard' | 'toolbar' | 'menu' | 'api'; [k: string]: unknown }) => {
      const ctx0 = ctxRef.current;
      if (!ctx0) return false;
      const source = (payload?.source ?? 'api') as 'keyboard' | 'toolbar' | 'menu' | 'api';

      const before = hooksRef.current?.onBeforeCommand;
      if (before) {
        const ok = before(id, { source, payload });
        if (ok === false) return false;
      }

      const reg = ctx0.store.get<Record<string, Command>>('commands:registry') ?? {};
      const cmd = reg[id];
      if (!cmd) {
        hooksRef.current?.onAfterCommand?.(id, { ok: false, source, payload });
        return false;
      }
      try {
        cmd.run(ctx0, { source });
        hooksRef.current?.onAfterCommand?.(id, { ok: true, source, payload });
        return true;
      } catch (err) {
        hooksRef.current?.onAfterCommand?.(id, { ok: false, source, payload });
        throw err;
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
        // 作为三方库：不要依赖 Vite 的 import.meta.env 类型，避免 d.ts 构建失败
        const isDev = typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : false;
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

  // 手势/输入
  const { onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = usePointerPan({
    containerRef,
    mouseRef,
    cameraRef,
    commitCamera,
  });

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
        const res = p.handlers?.onWheel?.(m, ctx);
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

  const { visibleNodes } = useVisibleNodes({
    nodes,
    cellSize,
    camera,
    viewport,
    overscanPx,
  });

  useEffect(() => {
    visibleNodesRef.current = visibleNodes;
  }, [visibleNodes]);

  // 严格 “in view”：不包含 overscan，用于 UI 展示当前屏幕内真正可见的节点数量
  const inViewCount = useMemo(() => {
    if (nodes.length === 0) return 0;
    if (viewport.w <= 0 || viewport.h <= 0) return 0;
    const z = camera.zoom || 1;
    const viewWorldRect = {
      x: camera.x,
      y: camera.y,
      w: viewport.w / z,
      h: viewport.h / z,
    };
    const index = buildSpatialIndex(nodes, cellSize);
    const candidates = querySpatialIndex(index, viewWorldRect);
    let count = 0;
    for (const n of candidates) {
      if (rectIntersects(viewWorldRect, { x: n.x, y: n.y, w: n.width, h: n.height })) count++;
    }
    return count;
  }, [camera.x, camera.y, camera.zoom, cellSize, nodes, viewport.h, viewport.w]);

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

      let sawContinue = false;
      const call = () => {
        for (const p of plugins) {
          if (p.enabled === false) continue;
          const handlers = p.handlers;
          const fn =
            type === 'down'
              ? handlers?.onPointerDown
              : type === 'move'
                ? handlers?.onPointerMove
                : type === 'up'
                  ? handlers?.onPointerUp
                  : handlers?.onPointerCancel;
          const res = fn?.(m, ctx);
          if (!res || res.handled === false) continue;
          if (res.mode === 'continue') {
            sawContinue = true;
            continue;
          }
          return { handled: true, mode: 'stop' } as HandlerResult;
        }
        return sawContinue ? ({ handled: true, mode: 'continue' } as HandlerResult) : ({ handled: false } as HandlerResult);
      };

      return call();
    },
    [plugins, ctx, screenToWorld]
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
      let sawContinue = false;
      for (const p of plugins) {
        if (p.enabled === false) continue;
        const res = p.handlers?.onContextMenu?.(m, ctx);
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
          type === 'down' ? p.handlers?.onKeyDown?.(m, ctx) : p.handlers?.onKeyUp?.(m, ctx);
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
      onPointerDown={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        onPointerDown(e);
      }}
      onPointerMove={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        onPointerMove(e);
      }}
      onPointerUp={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        onPointerUp(e);
      }}
      onPointerCancel={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        onPointerUp(e);
      }}
      onPointerLeave={(e) => {
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        onPointerLeave(e);
      }}
    >
      {/* 插件 background 层（在节点层之下） */}
      {plugins && plugins.length > 0 ? (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
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
      <div style={worldStyle}>{domNodeElements}</div>

      {/* 插件 overlay 层（guides / marquee / selection 等，默认插槽） */}
      {plugins && plugins.length > 0 ? (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
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
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
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
