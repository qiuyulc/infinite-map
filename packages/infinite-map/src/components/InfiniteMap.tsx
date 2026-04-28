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
import type { Camera, NodeData, Rect } from '../core/types';
import { buildSpatialIndex } from '../core/spatialIndex';
import { BackgroundDotsWorld } from './BackgroundDotsWorld';
import { BackgroundGridWorld } from './BackgroundGridWorld';
import { RenderPluginOverlays } from './RenderPluginOverlays';
import { RenderDomNodes } from './RenderDomNodes';
import { ViewportLayer } from './ViewportLayer';
import type { InfiniteMapDoc } from '../editor/document';
import type { EventKey, EventMap } from '../editor/types';
import { STORE_KEYS } from '../editor/keys';
import type { InfiniteMapTheme } from '../theme';
import '../theme-base.css';
import { useCamera } from '../hooks/useCamera';
// pan 已纳入 Scheme C gestures（不再使用独立 hook）
import { useViewportSize } from '../hooks/useViewportSize';
import { useCommandRegistry } from '../hooks/useCommandRegistry';
import { usePatchEngine } from '../hooks/usePatchEngine';
import { usePluginInputDispatch } from '../hooks/usePluginInputDispatch';
import { useRunCommandWithHooks } from '../hooks/useRunCommandWithHooks';
import { useAttachApiRef } from '../hooks/useAttachApiRef';
import { useVirtualizedVisibleNodes } from '../hooks/useVirtualizedVisibleNodes';
import { useMapRuntimeEffects } from '../hooks/useMapRuntimeEffects';
import { usePluginLifecycle } from '../hooks/usePluginLifecycle';
import { useMapContext } from '../hooks/useMapContext';
import { useCoordinateTransforms } from '../hooks/useCoordinateTransforms';
import { useSelectionGeometry } from '../hooks/useSelectionGeometry';
import { useInjectedThemeVars } from '../hooks/useInjectedThemeVars';
import type {
  ChangeMeta,
  Command,
  EditorErrorInfo,
  HitTestTarget,
  InfiniteMapPlugin,
  MapContext,
  NodePatch,
} from '../editor/types';
import { createEventBus, createStore } from '../editor/runtime';

export type InfiniteMapProps = {
  nodes: NodeData[];

  /**
   * 可选：插件系统（默认不传=纯预览）
   * - 插件数组顺序=优先级
   */
  plugins?: InfiniteMapPlugin[];

  /**
   * 是否允许编辑（语法糖）
   * - false：强制只读（阻止 applyPatches）
   * - true：允许编辑（等价于 editMode='controlled'）
   */
  editable?: boolean;
  /**
   * 编辑模式（推荐：显式设置，避免“看起来编辑无效”的隐式依赖）
   * - auto（默认，向后兼容）：允许插件产生 patches；若未提供 onNodesChange/onPatches，则仅在 DEV 下 warn
   * - readonly：强制只读（丢弃所有 patches）
   * - controlled：受控编辑，必须提供 onNodesChange 或 onPatches 作为变更出口（否则在 DEV 下抛错）
   */
  editMode?: 'auto' | 'readonly' | 'controlled';

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
  onEditorError?: (err: unknown, info: EditorErrorInfo) => void;

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
   * - none：无背景（用于性能排查/纯内容渲染）
   */
  backgroundMode?: 'dots' | 'grid' | 'none';
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
   * 调试开关（默认关闭）
   * - 打开后会写入一些调试信息到 store（debug:*），并在必要时 console.warn/console.debug
   */
  debug?: boolean;

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
   * 是否允许拖动平移画布（view pan）
   * - false：禁止空白拖拽平移 & Space 平移模式（适合做“锁定视图”）
   * - 默认 true
   */
  panEnabled?: boolean;

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
   * 订阅事件总线（selection/camera/history/patches/hover 等）
   */
  subscribe: <K extends EventKey>(type: K, handler: (payload: EventMap[K]) => void) => () => void;
  /**
   * 获取当前选中的节点 id 列表
   */
  getSelectionIds: () => string[];
  /**
   * 设置 selection（需要启用 selection service）
   */
  setSelectionIds: (ids: string[]) => void;
  /**
   * 订阅 selection 状态变化（用于 delete 按钮 enable/disable 等）
   */
  subscribeSelection: (listener: () => void) => () => void;
  /**
   * 获取节点矩形（axis-aligned，world 坐标；用于对齐/分布等）
   */
  getNodeRect: (id: string) => Rect | null;
  /**
   * 获取 selection 的包围盒（axis-aligned，world 坐标）
   */
  getSelectionRect: () => Rect | null;
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
   * doc 快照（与“文件导入导出”解耦）
   * - serializeDoc：把当前运行时状态序列化为 doc（纯数据）
   * - parseDoc：校验/解析 doc，并用 onNodesChange + setCamera 应用到宿主
   */
  serializeDoc: (meta?: Record<string, unknown>) => InfiniteMapDoc;
  parseDoc: (doc: unknown, opts?: { immediate?: boolean }) => void;
};

export function InfiniteMap({
  nodes,
  plugins,
  editable,
  editMode,
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
  panEnabled = true,
  apiRef,
  debug = false,
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
  // 重要：高频交互（drag/resize/marquee/hover）会频繁调用 requestRender。
  // 在 DevTools 打开/低帧率环境下，如果每次都 setState，会导致重复渲染与卡顿。
  // 这里用 rAF 合并：每帧最多触发一次 overlay re-render。
  const renderRafRef = useRef<number | null>(null);
  const requestRender = useCallback(() => {
    if (renderRafRef.current != null) return;
    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null;
      bumpOverlay((v) => v + 1);
    });
  }, []);
  useEffect(() => {
    return () => {
      if (renderRafRef.current != null) cancelAnimationFrame(renderRafRef.current);
    };
  }, []);

  // 主题变量（允许通过 props 注入；也支持外部 ThemeProvider 注入同名 --im-* 变量）
  const themeVars = useInjectedThemeVars(theme);

  // visibleNodes ref（给插件读取）
  const visibleNodesRef = useRef<NodeData[]>([]);

  // 空间索引（给插件查询）
  const spatialIndex = useMemo(() => buildSpatialIndex(nodes, cellSize), [nodes, cellSize]);
  const spatialIndexRef = useRef(spatialIndex);
  useEffect(() => {
    spatialIndexRef.current = spatialIndex;
  }, [spatialIndex]);

  const { screenToWorld, worldToScreen, rectScreenToWorld, rectWorldToScreen } = useCoordinateTransforms(cameraRef);

  // 插件 bus/store（稳定引用）
  const bus = useMemo(() => createEventBus(), []);
  const store = useMemo(() => createStore(), []);

  // 参考 react-flow：pan/zoom 时不依赖 React 每帧重渲染整棵树
  // - 每次相机变更都写入 store.viewTransform（给 ViewportLayer 订阅）
  // - 同时 emit camera:changed（给 HUD/插件订阅）
  const commitCameraWithEffects = useCallback(
    (next: Camera, immediate = false) => {
      commitCamera(next, immediate);
      const z = next.zoom || 1;
      store.set(STORE_KEYS.viewTransform, `translate3d(${-next.x * z}px, ${-next.y * z}px, 0) scale(${z})`);
      bus.emit('camera:changed', { camera: next });
    },
    [bus, commitCamera, store]
  );

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

  const debugRef = useRef(debug);
  useEffect(() => {
    debugRef.current = debug;
  }, [debug]);

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

  const hasChangeSink = Boolean(onNodesChange) || Boolean(onPatches);
  const resolvedEditMode = useMemo<'auto' | 'readonly' | 'controlled'>(() => {
    if (editMode) return editMode;
    if (editable === false) return 'readonly';
    if (editable === true) return 'controlled';
    return 'auto';
  }, [editMode, editable]);

  // 是否允许“修改 nodes”的编辑行为（给 editor 插件判断：是否渲染 handles / guides / 是否启用 drag/resize）
  // - auto：向后兼容（没有变更出口时，编辑能力关闭）
  // - readonly：强制关闭
  // - controlled：要求宿主提供变更出口，否则关闭（并在 applyPatches 处 DEV 抛错）
  const editEnabled = resolvedEditMode === 'readonly' ? false : hasChangeSink;

  // ctx 引用：供 runCommandWithHooks 在任意时刻拿到最新 ctx
  const ctxRef = useRef<MapContext | null>(null);

  // Scheme C：hover 命中（仅当没有 active gesture 时更新）
  const hoverRef = useRef<HitTestTarget>({ kind: 'blank' });

  const { applyPatches: applyPatchesRaw } = usePatchEngine({
    bus,
    nodesRef,
    onNodesChangeRef,
    onPatchesRef,
    hooksRef,
    hookModeRef,
    onEditorErrorRef,
  });

  const runCommandWithHooks = useRunCommandWithHooks({ ctxRef, hooksRef, hookModeRef, onEditorErrorRef });

  // 显式编辑模式：对 patches 生效做统一“闸门”
  const applyPatches = useCallback(
    (patches: NodePatch[], meta: ChangeMeta) => {
      if (resolvedEditMode === 'readonly') return;
      if (resolvedEditMode === 'controlled') {
        if (!onNodesChangeRef.current && !onPatchesRef.current) {
          const nodeEnv = (globalThis as any)?.process?.env?.NODE_ENV as string | undefined;
          const isDev = nodeEnv != null ? nodeEnv !== 'production' : false;
          if (isDev) {
            throw new Error(
              '[InfiniteMap] editMode="controlled" 需要提供 onNodesChange 或 onPatches 作为变更出口，否则编辑变更无法被宿主持久化。'
            );
          }
          return;
        }
      }
      applyPatchesRaw(patches, meta);
    },
    [applyPatchesRaw, resolvedEditMode]
  );

  const { ctx } = useMapContext({
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
  });

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

  // 视图交互：画布平移开关（用于“锁定视图”）
  useEffect(() => {
    ctx.store.set(STORE_KEYS.viewPanEnabled, panEnabled !== false);
  }, [ctx, panEnabled]);

  // 暴露编辑能力开关给插件（让 overlay/gestures 在只读/无出口时自动收敛）
  useEffect(() => {
    ctx.store.set(STORE_KEYS.editEnabled, editEnabled);
  }, [ctx, editEnabled]);

  // commands registry：将 plugins.commands 汇总到 store，供 CommandRunnerPlugin 使用
  useCommandRegistry({ plugins, store, commandConflictPolicy, warnOnCommandConflict });

  // 初始化 transform（避免首次订阅拿到默认值）
  useEffect(() => {
    const z = camera.zoom || 1;
    store.set(STORE_KEYS.viewTransform, `translate3d(${-camera.x * z}px, ${-camera.y * z}px, 0) scale(${z})`);
  }, [camera.x, camera.y, camera.zoom, store]);

  // 开发期提示：启用 plugins 但未提供受控出口时，编辑不会生效
  useEffect(() => {
    if (!plugins || plugins.length === 0) return;
    if (resolvedEditMode !== 'auto') return;
    if (onNodesChange || onPatches) return;
    const nodeEnv = (globalThis as any)?.process?.env?.NODE_ENV as string | undefined;
    const isDev = nodeEnv != null ? nodeEnv !== 'production' : false;
    if (!isDev) return;
    console.warn('[InfiniteMap] plugins 已启用，但未提供 onNodesChange/onPatches：编辑产生的变更将不会被宿主持久化（看起来像“编辑无效”）。');
  }, [plugins, onNodesChange, onPatches, resolvedEditMode]);

  const { getNodeRect, getSelectionRect } = useSelectionGeometry({ nodesRef, ctx });

  useAttachApiRef({
    apiRef,
    plugins,
    ctx,
    commitCamera: commitCameraWithEffects,
    runCommandWithHooks,
    getNodeRect,
    getSelectionRect,
    onNodesChange,
  });

  // 插件 setup/teardown（Milestone 1：只提供生命周期，不引入任何默认插件）
  usePluginLifecycle({ plugins, ctx, onEditorErrorRef });

  const { visibleNodes, pan } = useVirtualizedVisibleNodes({
    nodes,
    cellSize,
    camera,
    viewport,
    overscanPx,
    virtualization,
    store,
    debugRef,
    visibleNodesRef,
  });

  useMapRuntimeEffects({
    plugins,
    ctx,
    containerRef,
    highlightCanvasRef,
    viewport,
    viewportRef,
    camera,
    cameraRef,
    commitCamera: commitCameraWithEffects,
    mouseRef,
    pulseRef,
    panEnabled: panEnabled !== false,
    minZoom,
    maxZoom,
    zoomSpeed,
    pinchZoomFactor,
    dotSpacing,
    dotRadiusPx,
    highlightRadiusPx,
    wheelPulseStrength,
    screenToWorld,
    store,
    bus,
    minimapWidth,
    minimapHeight,
    minimapCachePadding,
    minimapNeedsRedraw,
  });

  const { dispatchPointer, dispatchContextMenu } = usePluginInputDispatch({
    plugins,
    ctx,
    containerRef,
    store,
    screenToWorld,
    commitCamera: commitCameraWithEffects,
    mouseRef,
    hoverRef,
    onEditorErrorRef,
    debugRef,
    pan: { ...pan, visibleNodesRef },
  });

  return (
    <div
      ref={containerRef}
      data-im-theme={themeBase ?? 'light'}
      tabIndex={0}
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
        outline: 'none',
      }}
      /**
       * 重要：插件事件分发使用 capture 阶段，确保即使子元素（例如节点拖拽）stopPropagation，
       * 也能收到点击/拖拽等事件（SelectionPlugin 需要）。
       */
      onPointerDownCapture={(e) => {
        // 组件库的 UI（toolbar/menu 等）不应被“画布插件”拦截
        const t = e.target as unknown as HTMLElement | null;
        if (t?.closest?.('[data-im-ui]')) return;
        // 让键盘快捷键只在画布聚焦时生效（避免劫持页面级 Cmd/Ctrl+C）
        (e.currentTarget as HTMLElement).focus?.();
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
      {RenderPluginOverlays({ plugins, slot: 'background', ctx, zIndex: 0, onEditorError: onEditorErrorRef.current })}

      {/* 背景（放入 ViewportLayer：pan 时无需依赖 camera.x/y 更新） */}
      <ViewportLayer store={store} zIndex={0}>
        {backgroundMode === 'grid' ? (
          <BackgroundGridWorld
            zoom={cameraRef.current.zoom || 1}
            gridSpacing={gridSpacing === 'auto' ? 'auto' : gridSpacing ?? dotSpacing}
            gridAlpha={gridAlpha}
          />
        ) : backgroundMode === 'dots' ? (
          <BackgroundDotsWorld
            zoom={cameraRef.current.zoom || 1}
            dotSpacing={dotSpacing}
            dotRadiusPx={dotRadiusPx}
            dotAlpha={dotAlpha}
          />
        ) : null}
      </ViewportLayer>

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
      <ViewportLayer store={store} zIndex={1}>
        <RenderDomNodes
          cameraRef={cameraRef}
          visibleNodes={visibleNodes}
          zIndex={1}
          onNodeDrag={onNodeDrag}
          renderNode={renderNode}
          renderNodeContent={renderNodeContent}
          getDefaultNodeProps={getDefaultNodeProps}
          defaultNodeShowMeta={defaultNodeShowMeta}
        />
      </ViewportLayer>

      {/* 插件 overlay 层（guides / marquee / selection 等，默认插槽） */}
      {RenderPluginOverlays({ plugins, slot: 'overlay', ctx, zIndex: 2, onEditorError: onEditorErrorRef.current })}

      {/* 插件 hud 层（minimap/标尺/面板等，通常最上层） */}
      {RenderPluginOverlays({ plugins, slot: 'hud', ctx, zIndex: 3, onEditorError: onEditorErrorRef.current })}

    </div>
  );
}
